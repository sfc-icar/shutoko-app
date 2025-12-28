import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue } from 'react-native-reanimated';
import { useRunOnJS } from 'react-native-worklets-core';

export default function App() {
  // 1. カメラの権限を管理
  const { hasPermission, requestPermission } = useCameraPermission();

  // 2. 背面カメラを取得
  const device = useCameraDevice('back');

  // 3. 状態管理
  const [modelResult, setModelResult] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15); // カウントダウン（残り秒数）
  const [value0, setValue0] = useState<number | null>(null); // value0を追加
  const [value1, setValue1] = useState<number | null>(null); // value1を追加

  // カウントダウンタイマーのref
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 起動時に権限をリクエスト
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // カウントダウンをリセットする関数
  const resetCountdown = useCallback(() => {
    setCountdown(15);
  }, []);

  // カウントダウンタイマーを開始
  useEffect(() => {
    if (!hasPermission || !device) return;

    // 1秒ごとにカウントダウンを減らす
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next < 0) {
          return 15; // 0になったら15にリセット
        }
        return next;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [hasPermission, device]);

  // 1. モデルロード
  const plugin = useTensorflowModel(require('./assets/30emodel-float32.tflite'));
  const model = plugin.state === 'loaded' ? plugin.model : undefined;

  // 2. リサイズ用プラグインのロード
  const { resize } = useResizePlugin();

  // 3. タイマー管理（15秒間隔）
  const lastRun = useSharedValue(0);

  // 4. 結果表示用 (JS側) - 数値のみを受け取る
  const updateResult = useCallback((value0: number, value1: number) => {
    console.log('推論完了: value0=', value0, 'value1=', value1);
    setValue0(value0); // value0を保存
    setValue1(value1); // value1を保存
    // モデルの出力に合わせて判定
    const label = value0 > value1 ? '首都高' : '一般道';
    setModelResult(label);
    // 推論が完了したらカウントダウンをリセット
    resetCountdown();
  }, [resetCountdown]);

  // useRunOnJSで安全にJS関数を呼び出す
  const runUpdate = useRunOnJS(updateResult, []);

  // フレームプロセッサ（worklet内で直接推論）
  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';

      if (plugin.state !== 'loaded' || !model || !resize) return;

      const now = Date.now();
      // 15秒経過チェック
      if (now - lastRun.value > 15000) {
        try {
          // フレームをリサイズ
          const resized = resize(frame, {
            scale: {
              width: 224,
              height: 224,
            },
            pixelFormat: 'rgb',
            dataType: 'float32',
          });

          if (!resized) return;

          // 推論実行
          const outputs = model.runSync([resized]);

          // outputsはTypedArrayの配列なので、worklet内で処理
          const out0 = outputs && outputs.length > 0 ? outputs[0] : undefined;
          if (!out0 || out0.length < 2) return;

          // 必要な数値だけを抽出してJSに渡す
          const value0 = Number(out0[0]);
          const value1 = Number(out0[1]);

          // 数値のみをJSに渡す
          runUpdate(value0, value1);

          lastRun.value = now;
        } catch (e) {
          // エラーは無視（worklet内でログを出すと重い）
        }
      }
    },
    [plugin, model, resize, runUpdate]
  );

  if (!hasPermission) return <View style={styles.container}><Text>カメラ権限がありません</Text></View>;
  if (device == null) return <View style={styles.container}><Text>カメラが見つかりません</Text></View>;

  return (
    <View style={styles.container}>
      {/* カメラを表示 */}
      <Camera
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      {/* アプリ名とvalue0/value1 */}
      <View style={styles.overlay}>
        <Text style={styles.text}>首都高判定アプリ (v0.1)</Text>
        {value0 !== null && value1 !== null && (
          <>
            <Text style={styles.valueText}>value0: {value0.toFixed(4)}</Text>
            <Text style={styles.valueText}>value1: {value1.toFixed(4)}</Text>
          </>
        )}
      </View>
      {/* カウントダウン表示 */}
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownText}>
          {countdown > 0 ? `次の推論まで: ${countdown}秒` : '推論中...'}
        </Text>
      </View>
      {/* モデル実行結果 */}
      {modelResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{modelResult}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
    minWidth: 200,
  },
  text: { color: 'white', fontSize: 20, marginBottom: 4 },
  valueText: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  resultContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    padding: 15,
    borderRadius: 10,
    maxWidth: '80%',
  },
  resultText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countdownContainer: {
    position: 'absolute',
    bottom: 180, // overlayの上に配置（value0/value1がある場合の高さを考慮）
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  countdownText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

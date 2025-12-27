import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';

export default function App() {
  // 1. カメラの権限を管理
  const { hasPermission, requestPermission } = useCameraPermission();

  // 2. 背面カメラを取得
  const device = useCameraDevice('back');

  // 3. 状態管理
  const [modelResult, setModelResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    // 起動時に権限をリクエスト
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // TFLiteモデルをロード（react-native-fast-tfliteのAPIを使用）
  const tensorflowModel = useTensorflowModel(require('./assets/30emodel-float32.tflite'));
  const model = tensorflowModel.state === 'loaded' ? tensorflowModel.model : undefined;

  // ボタンを押したら推論を実行
  const handleInference = async () => {
    if (isProcessing || !model || !cameraRef.current) {
      console.log('スキップ: 処理中またはモデル/カメラが準備できていません');
      return;
    }

    setIsProcessing(true);
    setModelResult('処理中...');

    try {
      // カメラから写真を撮影
      console.log('📸 写真を撮影します...');
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });

      console.log('✅ 写真を撮影しました:', photo.path);

      // TODO: 写真をモデルの入力形式に変換して推論を実行
      // 例: 写真を読み込んで、リサイズして、モデルに入力
      // const imageData = await loadImage(photo.path);
      // const resized = resizeImage(imageData, { width: 224, height: 224 });
      // const outputs = model.runSync([resized]);

      // 一時的な結果表示
      setModelResult('推論実装待ち（写真撮影は成功）');
      console.log('✅ 推論処理完了');

    } catch (error) {
      console.error('❌ 推論エラー:', error);
      setModelResult('エラー: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!hasPermission) return <View style={styles.container}><Text>カメラ権限がありません</Text></View>;
  if (device == null) return <View style={styles.container}><Text>カメラが見つかりません</Text></View>;

  return (
    <View style={styles.container}>
      {/* カメラを表示 */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={true}
        photo={true}
      />
      <View style={styles.overlay}>
        <Text style={styles.text}>首都高判定アプリ (v0.1)</Text>
      </View>
      {/* 推論ボタン */}
      <TouchableOpacity
        style={[styles.button, isProcessing && styles.buttonDisabled]}
        onPress={handleInference}
        disabled={isProcessing || !model}
      >
        <Text style={styles.buttonText}>
          {isProcessing ? '処理中...' : '推論実行'}
        </Text>
      </TouchableOpacity>
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
  overlay: { position: 'absolute', bottom: 50, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
  text: { color: 'white', fontSize: 20 },
  button: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 150,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(128, 128, 128, 0.7)',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
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
});

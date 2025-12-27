import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

export default function App() {
  // 1. カメラの権限を管理
  const { hasPermission, requestPermission } = useCameraPermission();

  // 2. 背面カメラを取得
  const device = useCameraDevice('back');

  // 3. カウントダウンタイマー
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    // 起動時に権限をリクエスト
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // カウントダウンタイマーの処理
  useEffect(() => {
    if (!hasPermission || device == null) return;

    // タイマーを開始
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 15;  // ← clearIntervalを消して、15にリセット
        }
        return prev - 1;
      });
    }, 1000);

    // クリーンアップ（コンポーネントがアンマウントされたときにタイマーを停止）
    return () => clearInterval(timer);
  }, [hasPermission, device]);

  if (!hasPermission) return <View style={styles.container}><Text>カメラ権限がありません</Text></View>;
  if (device == null) return <View style={styles.container}><Text>カメラが見つかりません</Text></View>;

  return (
    <View style={styles.container}>
      {/* 3. カメラを表示 */}
      <Camera
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={true}
      />
      <View style={styles.overlay}>
        <Text style={styles.text}>首都高判定アプリ (v0.1)</Text>
      </View>
      {/* カウントダウンタイマー */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{countdown}秒</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  overlay: { position: 'absolute', bottom: 50, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
  text: { color: 'white', fontSize: 20 },
  timerContainer: {
    position: 'absolute',
    bottom: 120, // overlayの上に配置
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  timerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
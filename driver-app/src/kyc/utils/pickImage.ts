// Lightweight image picker helper using expo-image-picker.
// Falls back gracefully if the module isn't installed yet.

import { Alert, Platform } from 'react-native';

export async function pickImage(): Promise<string | null> {
  try {
    // Dynamic require so the app doesn't crash if expo-image-picker isn't installed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ImagePicker = require('expo-image-picker');

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo access to upload documents.');
        return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  } catch {
    Alert.alert('Not available', 'Image picker is not available on this device.');
    return null;
  }
}

export async function takeSelfie(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ImagePicker = require('expo-image-picker');

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow camera access to take a selfie.');
        return null;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
      cameraType: ImagePicker.CameraType.front,
    });

    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  } catch {
    Alert.alert('Not available', 'Camera is not available on this device.');
    return null;
  }
}

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, tracking, lineHeight } from '../../lib/theme';
import { createPost, uploadImage } from '../../lib/api';
import { getLocationInfo, LocationInfo } from '../../lib/location';

const MAX_CHARS = 300;

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getLocationInfo().then(setLocation);
  }, []);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
  };

  const handleSubmit = async () => {
    if (!content.trim() || !location || submitting) return;
    setSubmitting(true);
    try {
      let image_url: string | undefined;
      if (imageUri) {
        setUploadingImage(true);
        try {
          const uploaded = await uploadImage(imageUri);
          image_url = uploaded.url;
        } finally {
          setUploadingImage(false);
        }
      }
      await createPost({
        content: content.trim(),
        lat: location.lat,
        lng: location.lng,
        ...(image_url ? { image_url } : {}),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setContent('');
      setImageUri(null);
      showSuccess();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const showSuccess = () => {
    setSuccess(true);
    Animated.sequence([
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(successOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setSuccess(false));
  };

  const remaining = MAX_CHARS - content.length;
  const canSubmit = content.trim().length > 0 && !!location && !submitting;
  const counterColor =
    remaining < 10 ? colors.destructive :
    remaining < 30 ? colors.textSecondary :
    colors.textMuted;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>JAWWING</Text>
          <TouchableOpacity
            style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : (
              <Text style={styles.postBtnText}>POST</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        {/* Identity + location bar */}
        <View style={styles.locationBar}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.locationText}>
            ANONYMOUS · {location ? location.displayName.toUpperCase() : 'LOCATING…'}
          </Text>
        </View>
        <View style={styles.divider} />

        {/* Text input */}
        <TextInput
          style={styles.input}
          placeholder="What's happening nearby?"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MAX_CHARS}
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
          autoFocus
          selectionColor={colors.textPrimary}
        />

        {/* Image preview */}
        {imageUri ? (
          <View style={styles.imagePreviewWrapper}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity style={styles.removeImage} onPress={handleRemoveImage}>
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color={colors.textPrimary} />
              </View>
            )}
          </View>
        ) : null}

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7} style={styles.toolbarBtn}>
            <Ionicons name="image-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.counter, { color: counterColor }]}>{remaining}</Text>
        </View>

        {/* Success overlay */}
        {success && (
          <Animated.View
            style={[styles.successOverlay, { opacity: successOpacity }]}
            pointerEvents="none"
          >
            <Text style={styles.successText}>POSTED</Text>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  topTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    letterSpacing: tracking.wide,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    lineHeight: lineHeight.body,
  },
  imagePreviewWrapper: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
  },
  removeImage: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: colors.border,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolbarBtn: {
    padding: 4,
  },
  counter: {
    fontSize: typography.xs,
    fontWeight: '600',
    letterSpacing: tracking.wide,
  },
  postBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
  },
  postBtnDisabled: {
    opacity: 0.3,
  },
  postBtnText: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.bg,
    letterSpacing: tracking.wider,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  successText: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: tracking.widest,
  },
});

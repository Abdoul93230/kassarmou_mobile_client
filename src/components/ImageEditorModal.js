import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';
import Slider from '@react-native-community/slider';

const COLORS = {
  primary: '#E87E04',
  secondary: '#008751',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#718096',
  background: '#F5F5F5',
  border: '#E2E8F0',
};

const { width } = Dimensions.get('window');
const EDITOR_SIZE = width - 80;

const ImageEditorModal = ({ visible, imageUri, onSave, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleSave = async () => {
    if (!imageUri) return;

    try {
      setProcessing(true);

      // Appliquer les transformations
      const actions = [];

      // Rotation
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // Redimensionnement avec crop pour simuler le zoom
      if (scale !== 1) {
        // Obtenir les dimensions de l'image
        const { width, height } = await new Promise((resolve) => {
          Image.getSize(imageUri, (w, h) => resolve({ width: w, height: h }));
        });

        const cropSize = Math.min(width, height) / scale;
        const originX = (width - cropSize) / 2;
        const originY = (height - cropSize) / 2;

        actions.push({
          crop: {
            originX: Math.max(0, originX),
            originY: Math.max(0, originY),
            width: cropSize,
            height: cropSize,
          },
        });
      }

      // Redimensionner à 500x500 pour optimiser
      actions.push({
        resize: {
          width: 500,
          height: 500,
        },
      });

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      onSave(result.uri);
      resetEditor();
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Erreur lors du traitement de l\'image');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    resetEditor();
    onCancel();
  };

  const resetEditor = () => {
    setScale(1);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} disabled={processing}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Éditer la photo</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={processing}
              style={styles.saveButton}
            >
              {processing ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.saveButtonText}>OK</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Image Preview */}
          <View style={styles.previewContainer}>
            <View style={styles.imageContainer}>
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  style={[
                    styles.image,
                    {
                      transform: [
                        { scale: scale },
                        { rotate: `${rotation}deg` },
                      ],
                    },
                  ]}
                  resizeMode="cover"
                />
              )}
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Zoom Control */}
            <View style={styles.controlGroup}>
              <View style={styles.controlHeader}>
                <Ionicons name="resize" size={20} color={COLORS.text} />
                <Text style={styles.controlLabel}>Zoom</Text>
                <Text style={styles.controlValue}>{scale.toFixed(1)}x</Text>
              </View>
              <View style={styles.sliderContainer}>
                <Ionicons name="remove" size={20} color={COLORS.textLight} />
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={3}
                  value={scale}
                  onValueChange={setScale}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primary}
                  disabled={processing}
                />
                <Ionicons name="add" size={20} color={COLORS.textLight} />
              </View>
            </View>

            {/* Rotation Control */}
            <View style={styles.controlGroup}>
              <View style={styles.controlHeader}>
                <Ionicons name="sync" size={20} color={COLORS.text} />
                <Text style={styles.controlLabel}>Rotation</Text>
                <Text style={styles.controlValue}>{rotation}°</Text>
              </View>
              <TouchableOpacity
                style={styles.rotateButton}
                onPress={handleRotate}
                disabled={processing}
              >
                <Ionicons name="sync" size={24} color={COLORS.white} />
                <Text style={styles.rotateButtonText}>Pivoter 90°</Text>
              </TouchableOpacity>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetEditor}
              disabled={processing}
            >
              <Ionicons name="refresh" size={20} color={COLORS.textLight} />
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    width: EDITOR_SIZE,
    height: EDITOR_SIZE,
    borderRadius: EDITOR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  controls: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  controlGroup: {
    marginBottom: 20,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  controlValue: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    marginHorizontal: 12,
  },
  rotateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  rotateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  resetButtonText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 6,
  },
});

export default ImageEditorModal;

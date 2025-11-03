import React from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

const CustomInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry,
  onTogglePassword,
  showPassword,
  error,
  keyboardType = 'default',
  required = false,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  leftComponent,
  rightComponent,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {leftComponent && <View style={styles.leftComponent}>{leftComponent}</View>}
        
        {icon && !leftComponent && (
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={COLORS.textLight} />
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            leftComponent && styles.inputWithLeftComponent,
            icon && !leftComponent && styles.inputWithIcon,
            (secureTextEntry || rightComponent) && styles.inputWithRightComponent,
            multiline && styles.inputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        )}
        
        {rightComponent && !secureTextEntry && (
          <View style={styles.rightComponent}>{rightComponent}</View>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  required: {
    color: '#FF6B6B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  iconContainer: {
    marginRight: 8,
  },
  leftComponent: {
    marginRight: 8,
  },
  rightComponent: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 12,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputWithLeftComponent: {
    paddingLeft: 0,
  },
  inputWithRightComponent: {
    paddingRight: 40,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingBottom: 12,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default CustomInput;

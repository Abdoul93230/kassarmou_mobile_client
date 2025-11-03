import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

// Liste des indicatifs les plus utilisés en Afrique de l'Ouest
const COUNTRY_CODES = [
  { code: '+227', country: 'Niger', flag: '🇳🇪' },
  { code: '+229', country: 'Bénin', flag: '🇧🇯' },
  { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+225', country: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: '+223', country: 'Mali', flag: '🇲🇱' },
  { code: '+221', country: 'Sénégal', flag: '🇸🇳' },
  { code: '+228', country: 'Togo', flag: '🇹🇬' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+237', country: 'Cameroun', flag: '🇨🇲' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+1', country: 'États-Unis/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'Royaume-Uni', flag: '🇬🇧' },
  { code: '+213', country: 'Algérie', flag: '🇩🇿' },
  { code: '+212', country: 'Maroc', flag: '🇲🇦' },
  { code: '+216', country: 'Tunisie', flag: '🇹🇳' },
  { code: '+20', country: 'Égypte', flag: '🇪🇬' },
];

const CountryCodePicker = ({ 
  value, 
  onSelect, 
  visible, 
  onClose, 
  selectedCode, 
  onSelectCode 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Support des deux modes d'utilisation
  const isControlled = visible !== undefined;
  const currentValue = selectedCode || value;
  const handleSelectCallback = onSelectCode || onSelect;
  
  const selectedCountry = COUNTRY_CODES.find(c => c.code === currentValue) || COUNTRY_CODES[0];

  const filteredCountries = COUNTRY_CODES.filter(country =>
    country.country.toLowerCase().includes(searchText.toLowerCase()) ||
    country.code.includes(searchText)
  );

  const handleSelect = (code) => {
    if (handleSelectCallback) {
      handleSelectCallback(code);
    }
    if (isControlled && onClose) {
      onClose();
    } else {
      setModalVisible(false);
    }
    setSearchText('');
  };

  const isModalVisible = isControlled ? visible : modalVisible;
  const closeModal = isControlled ? onClose : () => setModalVisible(false);

  return (
    <>
      {!isControlled && (
        <TouchableOpacity
          style={styles.trigger}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.code}>{selectedCountry.code}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
        </TouchableOpacity>
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Choisir un indicatif</Text>
            <TouchableOpacity
              onPress={closeModal}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un pays..."
              placeholderTextColor={COLORS.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.item,
                  item.code === currentValue && styles.itemSelected,
                ]}
                onPress={() => handleSelect(item.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.itemFlag}>{item.flag}</Text>
                <Text style={styles.itemCountry}>{item.country}</Text>
                <Text style={styles.itemCode}>{item.code}</Text>
                {item.code === currentValue && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginRight: 8,
  },
  flag: {
    fontSize: 20,
    marginRight: 6,
  },
  code: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.backgroundAlt,
    margin: 16,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.text,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  itemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  itemCountry: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  itemCode: {
    fontSize: 15,
    color: COLORS.textLight,
    marginRight: 8,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },
});

export default CountryCodePicker;

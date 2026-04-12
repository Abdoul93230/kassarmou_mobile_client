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

 // Europe
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+32', country: 'Belgique', flag: '🇧🇪' },
  { code: '+352', country: 'Luxembourg', flag: '🇱🇺' },
  { code: '+41', country: 'Suisse', flag: '🇨🇭' },
  { code: '+44', country: 'Royaume-Uni', flag: '🇬🇧' },
  { code: '+353', country: 'Irlande', flag: '🇮🇪' },
  { code: '+49', country: 'Allemagne', flag: '🇩🇪' },
  { code: '+43', country: 'Autriche', flag: '🇦🇹' },
  { code: '+31', country: 'Pays-Bas', flag: '🇳🇱' },
  { code: '+34', country: 'Espagne', flag: '🇪🇸' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+39', country: 'Italie', flag: '🇮🇹' },
  { code: '+30', country: 'Grèce', flag: '🇬🇷' },
  { code: '+46', country: 'Suède', flag: '🇸🇪' },
  { code: '+47', country: 'Norvège', flag: '🇳🇴' },
  { code: '+45', country: 'Danemark', flag: '🇩🇰' },
  { code: '+358', country: 'Finlande', flag: '🇫🇮' },
  { code: '+354', country: 'Islande', flag: '🇮🇸' },
  { code: '+48', country: 'Pologne', flag: '🇵🇱' },
  { code: '+420', country: 'Tchéquie', flag: '🇨🇿' },
  { code: '+421', country: 'Slovaquie', flag: '🇸🇰' },
  { code: '+36', country: 'Hongrie', flag: '🇭🇺' },
  { code: '+40', country: 'Roumanie', flag: '🇷🇴' },
  { code: '+359', country: 'Bulgarie', flag: '🇧🇬' },
  { code: '+385', country: 'Croatie', flag: '🇭🇷' },
  { code: '+386', country: 'Slovénie', flag: '🇸🇮' },
  { code: '+381', country: 'Serbie', flag: '🇷🇸' },
  { code: '+382', country: 'Monténégro', flag: '🇲🇪' },
  { code: '+387', country: 'Bosnie-Herzégovine', flag: '🇧🇦' },
  { code: '+389', country: 'Macédoine du Nord', flag: '🇲🇰' },
  { code: '+355', country: 'Albanie', flag: '🇦🇱' },
  { code: '+383', country: 'Kosovo', flag: '🇽🇰' },
  { code: '+7', country: 'Russie', flag: '🇷🇺' },
  { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
  { code: '+375', country: 'Biélorussie', flag: '🇧🇾' },
  { code: '+370', country: 'Lituanie', flag: '🇱🇹' },
  { code: '+371', country: 'Lettonie', flag: '🇱🇻' },
  { code: '+372', country: 'Estonie', flag: '🇪🇪' },
  { code: '+373', country: 'Moldavie', flag: '🇲🇩' },
  { code: '+374', country: 'Arménie', flag: '🇦🇲' },
  { code: '+995', country: 'Géorgie', flag: '🇬🇪' },
  { code: '+994', country: 'Azerbaïdjan', flag: '🇦🇿' },
  { code: '+356', country: 'Malte', flag: '🇲🇹' },
  { code: '+357', country: 'Chypre', flag: '🇨🇾' },
  { code: '+376', country: 'Andorre', flag: '🇦🇩' },
  { code: '+377', country: 'Monaco', flag: '🇲🇨' },
  { code: '+378', country: 'Saint-Marin', flag: '🇸🇲' },
  { code: '+379', country: 'Vatican', flag: '🇻🇦' },


  // Afrique de l'Ouest (priorité)
  { code: '+227', country: 'Niger', flag: '🇳🇪' },
  { code: '+229', country: 'Bénin', flag: '🇧🇯' },
  { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+225', country: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: '+223', country: 'Mali', flag: '🇲🇱' },
  { code: '+221', country: 'Sénégal', flag: '🇸🇳' },
  { code: '+228', country: 'Togo', flag: '🇹🇬' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+237', country: 'Cameroun', flag: '🇨🇲' },
  { code: '+224', country: 'Guinée', flag: '🇬🇳' },
  { code: '+232', country: 'Sierra Leone', flag: '🇸🇱' },
  { code: '+231', country: 'Liberia', flag: '🇱🇷' },
  { code: '+220', country: 'Gambie', flag: '🇬🇲' },
  { code: '+245', country: 'Guinée-Bissau', flag: '🇬🇼' },
  { code: '+238', country: 'Cap-Vert', flag: '🇨🇻' },
  { code: '+222', country: 'Mauritanie', flag: '🇲🇷' },

  // Afrique Centrale
  { code: '+236', country: 'République Centrafricaine', flag: '🇨🇫' },
  { code: '+235', country: 'Tchad', flag: '🇹🇩' },
  { code: '+242', country: 'Congo', flag: '🇨🇬' },
  { code: '+243', country: 'RD Congo', flag: '🇨🇩' },
  { code: '+241', country: 'Gabon', flag: '🇬🇦' },
  { code: '+240', country: 'Guinée Équatoriale', flag: '🇬🇶' },
  { code: '+239', country: 'Sao Tomé-et-Príncipe', flag: '🇸🇹' },

  // Afrique de l'Est
  { code: '+251', country: 'Éthiopie', flag: '🇪🇹' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+255', country: 'Tanzanie', flag: '🇹🇿' },
  { code: '+256', country: 'Ouganda', flag: '🇺🇬' },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼' },
  { code: '+257', country: 'Burundi', flag: '🇧🇮' },
  { code: '+252', country: 'Somalie', flag: '🇸🇴' },
  { code: '+253', country: 'Djibouti', flag: '🇩🇯' },
  { code: '+291', country: 'Érythrée', flag: '🇪🇷' },
  { code: '+249', country: 'Soudan', flag: '🇸🇩' },
  { code: '+211', country: 'Soudan du Sud', flag: '🇸🇸' },

  // Afrique du Nord
  { code: '+213', country: 'Algérie', flag: '🇩🇿' },
  { code: '+212', country: 'Maroc', flag: '🇲🇦' },
  { code: '+216', country: 'Tunisie', flag: '🇹🇳' },
  { code: '+20', country: 'Égypte', flag: '🇪🇬' },
  { code: '+218', country: 'Libye', flag: '🇱🇾' },

  // Afrique Australe
  { code: '+27', country: 'Afrique du Sud', flag: '🇿🇦' },
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+260', country: 'Zambie', flag: '🇿🇲' },
  { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
  { code: '+267', country: 'Botswana', flag: '🇧🇼' },
  { code: '+264', country: 'Namibie', flag: '🇳🇦' },
  { code: '+268', country: 'Eswatini', flag: '🇸🇿' },
  { code: '+266', country: 'Lesotho', flag: '🇱🇸' },
  { code: '+261', country: 'Madagascar', flag: '🇲🇬' },
  { code: '+230', country: 'Maurice', flag: '🇲🇺' },
  { code: '+248', country: 'Seychelles', flag: '🇸🇨' },

  // Amérique du Nord & Caraïbes
  { code: '+1', country: 'États-Unis / Canada', flag: '🇺🇸' },
  { code: '+52', country: 'Mexique', flag: '🇲🇽' },
  { code: '+509', country: 'Haïti', flag: '🇭🇹' },
  { code: '+1-809', country: 'République Dominicaine', flag: '🇩🇴' },
  { code: '+53', country: 'Cuba', flag: '🇨🇺' },
  { code: '+1-876', country: 'Jamaïque', flag: '🇯🇲' },
  { code: '+596', country: 'Martinique', flag: '🇲🇶' },
  { code: '+590', country: 'Guadeloupe', flag: '🇬🇵' },
  { code: '+594', country: 'Guyane française', flag: '🇬🇫' },

  // Amérique du Sud
  { code: '+55', country: 'Brésil', flag: '🇧🇷' },
  { code: '+54', country: 'Argentine', flag: '🇦🇷' },
  { code: '+57', country: 'Colombie', flag: '🇨🇴' },
  { code: '+51', country: 'Pérou', flag: '🇵🇪' },
  { code: '+56', country: 'Chili', flag: '🇨🇱' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+593', country: 'Équateur', flag: '🇪🇨' },
  { code: '+591', country: 'Bolivie', flag: '🇧🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },

  // Moyen-Orient
  { code: '+966', country: 'Arabie Saoudite', flag: '🇸🇦' },
  { code: '+971', country: 'Émirats Arabes Unis', flag: '🇦🇪' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+965', country: 'Koweït', flag: '🇰🇼' },
  { code: '+973', country: 'Bahreïn', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+967', country: 'Yémen', flag: '🇾🇪' },
  { code: '+962', country: 'Jordanie', flag: '🇯🇴' },
  { code: '+961', country: 'Liban', flag: '🇱🇧' },
  { code: '+963', country: 'Syrie', flag: '🇸🇾' },
  { code: '+964', country: 'Irak', flag: '🇮🇶' },
  { code: '+98', country: 'Iran', flag: '🇮🇷' },
  { code: '+972', country: 'Israël', flag: '🇮🇱' },
  { code: '+90', country: 'Turquie', flag: '🇹🇷' },

  // Asie
  { code: '+86', country: 'Chine', flag: '🇨🇳' },
  { code: '+81', country: 'Japon', flag: '🇯🇵' },
  { code: '+82', country: 'Corée du Sud', flag: '🇰🇷' },
  { code: '+91', country: 'Inde', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Népal', flag: '🇳🇵' },
  { code: '+62', country: 'Indonésie', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+66', country: 'Thaïlande', flag: '🇹🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+60', country: 'Malaisie', flag: '🇲🇾' },
  { code: '+65', country: 'Singapour', flag: '🇸🇬' },
  { code: '+855', country: 'Cambodge', flag: '🇰🇭' },
  { code: '+856', country: 'Laos', flag: '🇱🇦' },
  { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
  { code: '+93', country: 'Afghanistan', flag: '🇦🇫' },

  // Océanie
  { code: '+61', country: 'Australie', flag: '🇦🇺' },
  { code: '+64', country: 'Nouvelle-Zélande', flag: '🇳🇿' },
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

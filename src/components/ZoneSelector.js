import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config/api';
import { COLORS } from '../config/constants';

const ZoneSelector = ({ selectedZone, onSelect, placeholder = "Sélectionner votre zone de livraison..." }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Charger toutes les zones au démarrage
  useEffect(() => {
    if (modalVisible) {
      fetchAllZones();
    }
  }, [modalVisible]);

  // Recherche dynamique avec debounce
  useEffect(() => {
    if (!modalVisible) return;

    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchZones(searchQuery.trim());
      } else if (searchQuery.trim().length === 0) {
        setSearchResults([]);
      }
    }, 300); // Délai de 300ms pour le debounce

    return () => clearTimeout(timer);
  }, [searchQuery, modalVisible]);

  const fetchAllZones = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/shipping2/zones`);
      if (response.data.success) {
        setZones(response.data.zones || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchZones = async (query) => {
    setSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/shipping2/zones/search`, {
        params: { q: query, limit: 20 }
      });
      
      if (response.data.success) {
        setSearchResults(response.data.data || []);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de zones:', error);
      // Fallback: filtrage local si l'API échoue
      const filtered = zones.filter(zone => 
        zone.name?.toLowerCase().includes(query.toLowerCase()) ||
        zone.fullPath?.toLowerCase().includes(query.toLowerCase()) ||
        zone.country?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setSearching(false);
    }
  };

  // Afficher soit les résultats de recherche, soit toutes les zones
  const displayedZones = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      return searchResults;
    }
    return zones;
  }, [searchQuery, searchResults, zones]);

  const handleSelectZone = (zone) => {
    onSelect(zone);
    setModalVisible(false);
    setSearchQuery('');
  };

  const renderZoneItem = ({ item }) => {
    const isSelected = selectedZone?._id === item._id;
    
    return (
      <TouchableOpacity
        style={[
          styles.zoneItem,
          isSelected && styles.zoneItemSelected
        ]}
        onPress={() => handleSelectZone(item)}
        activeOpacity={0.7}
      >
        <View style={styles.zoneItemContent}>
          <View style={styles.zoneItemInfo}>
            <Text style={[
              styles.zoneItemName,
              isSelected && styles.zoneItemNameSelected
            ]}>
              {item.name}
            </Text>
            {item.fullPath && item.fullPath !== item.name && (
              <Text style={styles.zoneItemPath}>📍 {item.fullPath}</Text>
            )}
            <View style={styles.zoneItemMeta}>
              {item.type && (
                <View style={styles.zoneTypeBadge}>
                  <Text style={styles.zoneTypeText}>{item.type}</Text>
                </View>
              )}
              {item.country && (
                <Text style={styles.zoneMetaText}>{item.country}</Text>
              )}
            </View>
          </View>
          
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Bouton de sélection */}
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectorButtonContent}>
          <Ionicons name="location" size={20} color={selectedZone ? COLORS.primary : COLORS.textLight} />
          <Text style={[
            styles.selectorButtonText,
            selectedZone && styles.selectorButtonTextSelected
          ]}>
            {selectedZone ? selectedZone.fullPath || selectedZone.name : placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
      </TouchableOpacity>

      {/* Modal de sélection */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une zone</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Barre de recherche */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une zone, ville, région..."
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
              {searching && (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />
              )}
            </View>

            {/* Aide à la recherche */}
            {searchQuery.length === 0 && (
              <View style={styles.searchHint}>
                <Text style={styles.searchHintText}>
                  💡 Tapez au moins 2 caractères pour rechercher (ex: "Niamey", "Niger", "Agadez")
                </Text>
              </View>
            )}

            {/* Liste des zones */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Chargement des zones...</Text>
              </View>
            ) : displayedZones.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={64} color={COLORS.textLighter} />
                <Text style={styles.emptyText}>
                  {searchQuery.length >= 2 ? 'Aucune zone trouvée' : 'Aucune zone disponible'}
                </Text>
                {searchQuery.length >= 2 && (
                  <Text style={styles.emptySubtext}>
                    Essayez avec un autre terme de recherche
                  </Text>
                )}
              </View>
            ) : (
              <FlatList
                data={displayedZones}
                renderItem={renderZoneItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.zonesList}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Footer avec info */}
            <View style={styles.modalFooter}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.footerText}>
                {displayedZones.length} zone{displayedZones.length > 1 ? 's' : ''} {searchQuery.length >= 2 ? 'trouvée' : 'disponible'}{displayedZones.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Bouton de sélection
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectorButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectorButtonText: {
    fontSize: 15,
    color: COLORS.textLight,
    flex: 1,
  },
  selectorButtonTextSelected: {
    color: COLORS.text,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },

  // Recherche
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    marginBottom: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  searchHint: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
  },
  searchHintText: {
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
  },

  // Liste des zones
  zonesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  zoneItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  zoneItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  zoneItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoneItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  zoneItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  zoneItemNameSelected: {
    color: COLORS.primary,
  },
  zoneItemPath: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  zoneItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  zoneTypeBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  zoneTypeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  zoneMetaText: {
    fontSize: 12,
    color: COLORS.textLighter,
  },

  // États vides et chargement
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textLight,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },

  // Footer
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});

export default ZoneSelector;

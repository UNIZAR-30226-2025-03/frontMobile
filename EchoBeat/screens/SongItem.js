// SongItem.js
import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SongItem = ({ item, drag, isActive, favoritos, editMode, moverCancion, toggleFavorito, setSelectedSong, setSongOptionsVisible, onPlayPress }) => {
  const esFavorita = favoritos.includes(item.id);

  return (
    <TouchableOpacity
      onLongPress={drag}
      disabled={isActive}
      style={[styles.songItem, isActive && { opacity: 0.8 }]}
      onPress={() => !editMode && onPlayPress()}
    >
      <Image source={{ uri: item.portada }} style={styles.songImage} />
      <View style={styles.songTextContainer}>
        <Text style={styles.songTitle} numberOfLines={1}>{item.nombre}</Text>
      </View>

      <View style={styles.songIconsContainer}>
        {editMode ? (
          <View style={{ marginRight: 8, alignItems: "center" }}>
            <TouchableOpacity onPress={() => moverCancion(item, -1)} style={{ marginBottom: 4 }}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => moverCancion(item, 1)}>
              <Ionicons name="arrow-down" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={() => toggleFavorito(item.id)} style={styles.heartButton}>
              <Ionicons name="heart" size={22} color={esFavorita ? "#f2ab55" : "#fff"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.songOptionsButton}
              onPress={() => {
                setSelectedSong(item);
                setSongOptionsVisible(true);
              }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 8,
    marginVertical: 5,
    marginHorizontal: 10,
    padding: 8,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  songTextContainer: {
    flex: 1,
    marginHorizontal: 10,
    justifyContent: "center",
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  songIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  heartButton: {
    marginRight: 5,
  },
  songOptionsButton: {},
});

export default memo(SongItem);

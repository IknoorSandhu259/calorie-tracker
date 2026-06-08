import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, Pressable,
  FlatList, StyleSheet, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { getSavedMeals, deleteSavedMeal, type SavedMeal } from '../lib/savedMeals'
import { useTheme, type AppColors } from '../constants/colors'

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (meal: SavedMeal) => void
}

export default function SavedMealsSheet({ visible, onClose, onSelect }: Props) {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])
  const [meals, setMeals] = useState<SavedMeal[]>([])

  useEffect(() => {
    if (visible) getSavedMeals().then(setMeals)
  }, [visible])

  async function handleDelete(id: string) {
    await deleteSavedMeal(id)
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          {/* Handle bar */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Saved Meals</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={c.textLabel} />
            </TouchableOpacity>
          </View>

          {meals.length === 0 ? (
            <View style={s.empty}>
              <Feather name="bookmark" size={28} color={c.textLabel} />
              <Text style={s.emptyTitle}>No saved meals yet</Text>
              <Text style={s.emptySubtitle}>
                When adding a meal, check &quot;Save as template&quot; to reuse it here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={meals}
              keyExtractor={(m) => m.id}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.row} onPress={() => { onSelect(item); onClose() }}>
                  <View style={s.rowLeft}>
                    <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.rowMeta}>
                      {item.calories} kcal
                      {item.protein != null ? ` · ${item.protein}g P` : ''}
                      {item.carbs != null ? ` · ${item.carbs}g C` : ''}
                      {item.fat != null ? ` · ${item.fat}g F` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Delete ${item.name}`}
                  >
                    <Feather name="trash-2" size={15} color={c.iconMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={s.separator} />}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.cardBg,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      maxHeight: '75%',
    },
    handle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: c.border, alignSelf: 'center',
      marginTop: 12, marginBottom: 16,
    },
    header: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 16,
    },
    title: { fontSize: 16, fontWeight: '600', color: c.textPrimary },
    empty: {
      alignItems: 'center', paddingVertical: 40, gap: 10,
    },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: c.textSecondary },
    emptySubtitle: {
      fontSize: 13, color: c.textMuted,
      textAlign: 'center', lineHeight: 18,
    },
    list: { paddingBottom: 8 },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, gap: 12,
    },
    rowLeft: { flex: 1 },
    rowName: { fontSize: 14, fontWeight: '500', color: c.textSecondary },
    rowMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    separator: { height: 1, backgroundColor: c.border },
  })
}

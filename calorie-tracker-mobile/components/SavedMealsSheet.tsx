import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Modal, Pressable,
  FlatList, StyleSheet, Platform, KeyboardAvoidingView, Alert,
  useWindowDimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import {
  getSavedMeals,
  deleteSavedMeal,
  updateSavedMeal,
  type SavedMeal,
} from '../lib/savedMeals'
import { useTheme, type AppColors } from '../constants/colors'

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (meal: SavedMeal) => void
}

function parseOptional(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function hasInvalidOptional(value: string): boolean {
  if (value.trim() === '') return false
  const parsed = Number(value)
  return !Number.isFinite(parsed) || parsed < 0
}

export default function SavedMealsSheet({ visible, onClose, onSelect }: Props) {
  const { height: windowHeight } = useWindowDimensions()
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])
  const sheetHeight = Math.round(windowHeight * 0.75)
  const [meals, setMeals] = useState<SavedMeal[]>([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCalories, setEditCalories] = useState('')
  const [editProtein, setEditProtein] = useState('')
  const [editCarbs, setEditCarbs] = useState('')
  const [editFat, setEditFat] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const filteredMeals = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return meals
    return meals.filter((meal) => meal.name.toLowerCase().includes(term))
  }, [meals, search])

  const hasUnsavedEdit = useMemo(() => {
    if (!editingId) return false
    const original = meals.find((meal) => meal.id === editingId)
    if (!original) return false
    return (
      editName !== original.name ||
      editCalories !== String(original.calories) ||
      editProtein !== (original.protein != null ? String(original.protein) : '') ||
      editCarbs !== (original.carbs != null ? String(original.carbs) : '') ||
      editFat !== (original.fat != null ? String(original.fat) : '')
    )
  }, [editingId, editName, editCalories, editProtein, editCarbs, editFat, meals])

  useEffect(() => {
    if (visible) {
      setSearch('')
      cancelEdit()
      getSavedMeals().then(setMeals)
    }
  }, [visible])

  function startEdit(meal: SavedMeal) {
    setEditingId(meal.id)
    setEditName(meal.name)
    setEditCalories(String(meal.calories))
    setEditProtein(meal.protein != null ? String(meal.protein) : '')
    setEditCarbs(meal.carbs != null ? String(meal.carbs) : '')
    setEditFat(meal.fat != null ? String(meal.fat) : '')
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditCalories('')
    setEditProtein('')
    setEditCarbs('')
    setEditFat('')
    setEditError(null)
  }

  function confirmDiscard(onDiscard: () => void) {
    if (!hasUnsavedEdit) {
      onDiscard()
      return
    }

    Alert.alert(
      'Discard changes?',
      'Your template edits have not been saved.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            cancelEdit()
            onDiscard()
          },
        },
      ],
    )
  }

  function handleClose() {
    confirmDiscard(onClose)
  }

  function handleSelect(meal: SavedMeal) {
    confirmDiscard(() => {
      onSelect(meal)
      onClose()
    })
  }

  function handleStartEdit(meal: SavedMeal) {
    confirmDiscard(() => startEdit(meal))
  }

  async function handleDelete(id: string) {
    await deleteSavedMeal(id)
    setMeals((prev) => prev.filter((m) => m.id !== id))
    if (editingId === id) cancelEdit()
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setEditError(null)

    const calories = Number(editCalories)
    if (!editName.trim()) { setEditError('Name is required.'); return }
    if (!Number.isFinite(calories) || calories <= 0) { setEditError('Enter valid calories.'); return }
    if (hasInvalidOptional(editProtein) || hasInvalidOptional(editCarbs) || hasInvalidOptional(editFat)) {
      setEditError('Macros must be non-negative numbers.')
      return
    }

    await updateSavedMeal(editingId, {
      name: editName.trim(),
      calories,
      protein: parseOptional(editProtein),
      carbs: parseOptional(editCarbs),
      fat: parseOptional(editFat),
    })
    cancelEdit()
    setMeals(await getSavedMeals())
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={s.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.keyboardWrap}
        >
          <Pressable style={s.sheetPressable} onPress={() => {}}>
            <View style={[s.sheet, { height: sheetHeight }]}>
              <View style={s.header}>
                <Text style={s.title}>Saved Meals</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={20} color={c.textLabel} />
                </TouchableOpacity>
              </View>

              {meals.length > 0 && (
                <View style={s.searchWrap}>
                  <Feather name="search" size={15} color={c.textLabel} />
                  <TextInput
                    style={s.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search meals"
                    placeholderTextColor={c.placeholder}
                    returnKeyType="search"
                  />
                </View>
              )}

              <View style={s.contentArea}>
                {meals.length === 0 ? (
                  <View style={s.empty}>
                    <Feather name="bookmark" size={28} color={c.textLabel} />
                    <Text style={s.emptyTitle}>No saved meals yet</Text>
                    <Text style={s.emptySubtitle}>
                      When adding a meal, check &quot;Save as template&quot; to reuse it here.
                    </Text>
                  </View>
                ) : filteredMeals.length === 0 ? (
                  <View style={s.empty}>
                    <Feather name="search" size={28} color={c.textLabel} />
                    <Text style={s.emptyTitle}>No matching meals</Text>
                    <Text style={s.emptySubtitle}>Try a different search.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredMeals}
                    keyExtractor={(m) => m.id}
                    contentContainerStyle={s.list}
                    style={s.listView}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    renderItem={({ item }) => (
                      <View style={s.row}>
                        {editingId === item.id ? (
                          <View style={s.editPanel}>
                            <TextInput
                              style={s.editInput}
                              value={editName}
                              onChangeText={setEditName}
                              placeholder="Meal name"
                              placeholderTextColor={c.placeholder}
                            />
                            <TextInput
                              style={s.editInput}
                              value={editCalories}
                              onChangeText={setEditCalories}
                              placeholder="Calories"
                              placeholderTextColor={c.placeholder}
                              keyboardType="numeric"
                            />
                            <View style={s.editMacroRow}>
                              <TextInput
                                style={[s.editInput, s.editMacroInput]}
                                value={editProtein}
                                onChangeText={setEditProtein}
                                placeholder="P"
                                placeholderTextColor={c.placeholder}
                                keyboardType="decimal-pad"
                              />
                              <TextInput
                                style={[s.editInput, s.editMacroInput]}
                                value={editCarbs}
                                onChangeText={setEditCarbs}
                                placeholder="C"
                                placeholderTextColor={c.placeholder}
                                keyboardType="decimal-pad"
                              />
                              <TextInput
                                style={[s.editInput, s.editMacroInput]}
                                value={editFat}
                                onChangeText={setEditFat}
                                placeholder="F"
                                placeholderTextColor={c.placeholder}
                                keyboardType="decimal-pad"
                              />
                            </View>
                            {editError && <Text style={s.editError}>{editError}</Text>}
                            <View style={s.editActions}>
                              <TouchableOpacity
                                style={s.editActionButton}
                                onPress={() => confirmDiscard(cancelEdit)}
                              >
                                <Feather name="x" size={16} color={c.textLabel} />
                                <Text style={s.editActionText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={s.editActionButton} onPress={handleSaveEdit}>
                                <Feather name="check" size={16} color={c.textSecondary} />
                                <Text style={s.editActionText}>Save</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity style={s.rowLeft} onPress={() => handleSelect(item)}>
                              <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
                              <Text style={s.rowMeta}>
                                {item.calories} kcal
                                {item.protein != null ? ` - ${item.protein}g P` : ''}
                                {item.carbs != null ? ` - ${item.carbs}g C` : ''}
                                {item.fat != null ? ` - ${item.fat}g F` : ''}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleStartEdit(item)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityLabel={`Edit ${item.name}`}
                            >
                              <Feather name="edit-2" size={15} color={c.iconMuted} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDelete(item.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityLabel={`Delete ${item.name}`}
                            >
                              <Feather name="trash-2" size={15} color={c.iconMuted} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                    ItemSeparatorComponent={() => <View style={s.separator} />}
                  />
                )}
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
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
    keyboardWrap: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
    },
    sheetPressable: {
      width: '100%',
    },
    sheet: {
      width: '100%',
      backgroundColor: c.cardBg,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 16,
    },
    title: { fontSize: 16, fontWeight: '600', color: c.textPrimary },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Platform.OS === 'ios' ? 11 : 8,
      fontSize: 14,
      color: c.textPrimary,
    },
    empty: {
      alignItems: 'center', paddingVertical: 40, gap: 10,
    },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: c.textSecondary },
    emptySubtitle: {
      fontSize: 13, color: c.textMuted,
      textAlign: 'center', lineHeight: 18,
    },
    contentArea: {
      flex: 1,
      minHeight: 120,
    },
    listView: {
      flex: 1,
    },
    list: { paddingBottom: 20 },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, gap: 12,
    },
    rowLeft: { flex: 1 },
    rowName: { fontSize: 14, fontWeight: '500', color: c.textSecondary },
    rowMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    editPanel: { flex: 1, gap: 8 },
    editInput: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      color: c.textPrimary,
      fontSize: 14,
    },
    editMacroRow: { flexDirection: 'row', gap: 8 },
    editMacroInput: { flex: 1 },
    editError: { fontSize: 12, color: c.error },
    editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    editActionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
    editActionText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    separator: { height: 1, backgroundColor: c.border },
  })
}

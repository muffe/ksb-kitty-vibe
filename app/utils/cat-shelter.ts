import type { Database } from '~/types/supabase'

export type Daypart = 'morning' | 'evening'

export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomInsert = Database['public']['Tables']['rooms']['Insert']
export type RoomUpdate = Database['public']['Tables']['rooms']['Update']
export type FeedingHistoryEntry = Database['public']['Tables']['room_feeding_history']['Row']
export type RoomLog = Database['public']['Tables']['room_logs']['Row']
export type RoomLogInsert = Database['public']['Tables']['room_logs']['Insert']
export type RoomLogUpdate = Database['public']['Tables']['room_logs']['Update']

export interface RoomRelation {
  name: string
  number: string | null
}

export interface RoomLogWithRoom extends RoomLog {
  room?: RoomRelation | null
}

export interface RoomFormState {
  name: string
  number: string
  description: string
  warning_info: string
  sort_order: number
  morning_dry_food: string
  morning_wet_food: string
  morning_medicine: string
  evening_dry_food: string
  evening_wet_food: string
  evening_medicine: string
}

export interface RoomLogFormState {
  daypart: Daypart
  ate_all_food: boolean
  no_stool_found: boolean
  stool_firm: number
  stool_almost_firm: number
  stool_soft: number
  stool_mixed: number
  stool_mushy: number
  stool_watery: number
  employee_name: string
  comment: string
}

export type StoolFieldKey
  = | 'stool_firm'
    | 'stool_almost_firm'
    | 'stool_soft'
    | 'stool_mixed'
    | 'stool_mushy'
    | 'stool_watery'

export const daypartOptions = [
  { label: 'Morgens', value: 'morning' as const },
  { label: 'Abends', value: 'evening' as const }
]

export const stoolFields: { key: StoolFieldKey, label: string }[] = [
  { key: 'stool_firm', label: 'Fest' },
  { key: 'stool_almost_firm', label: 'Fast fest' },
  { key: 'stool_soft', label: 'Weiche Wurst' },
  { key: 'stool_mixed', label: 'Halb/Halb' },
  { key: 'stool_mushy', label: 'Brei' },
  { key: 'stool_watery', label: 'Wässrig' }
]

export function createRoomFormState(sortOrder = 1): RoomFormState {
  return {
    name: '',
    number: '',
    description: '',
    warning_info: '',
    sort_order: sortOrder,
    morning_dry_food: '',
    morning_wet_food: '',
    morning_medicine: '',
    evening_dry_food: '',
    evening_wet_food: '',
    evening_medicine: ''
  }
}

export function roomToFormState(room: Room): RoomFormState {
  return {
    name: room.name,
    number: room.number ?? '',
    description: room.description ?? '',
    warning_info: room.warning_info ?? '',
    sort_order: room.sort_order,
    morning_dry_food: room.morning_dry_food,
    morning_wet_food: room.morning_wet_food,
    morning_medicine: room.morning_medicine,
    evening_dry_food: room.evening_dry_food,
    evening_wet_food: room.evening_wet_food,
    evening_medicine: room.evening_medicine
  }
}

export function sanitizeRoomPayload(state: RoomFormState): RoomInsert | RoomUpdate {
  return {
    name: state.name.trim(),
    number: emptyToNull(state.number),
    description: emptyToNull(state.description),
    warning_info: emptyToNull(state.warning_info),
    sort_order: clampInteger(state.sort_order, 1),
    morning_dry_food: state.morning_dry_food.trim(),
    morning_wet_food: state.morning_wet_food.trim(),
    morning_medicine: state.morning_medicine.trim(),
    evening_dry_food: state.evening_dry_food.trim(),
    evening_wet_food: state.evening_wet_food.trim(),
    evening_medicine: state.evening_medicine.trim()
  }
}

export function createRoomLogFormState(daypart: Daypart = 'morning'): RoomLogFormState {
  return {
    daypart,
    ate_all_food: false,
    no_stool_found: false,
    stool_firm: 0,
    stool_almost_firm: 0,
    stool_soft: 0,
    stool_mixed: 0,
    stool_mushy: 0,
    stool_watery: 0,
    employee_name: '',
    comment: ''
  }
}

export function roomLogToFormState(log: Pick<RoomLog, keyof RoomLogFormState>): RoomLogFormState {
  return {
    daypart: log.daypart as Daypart,
    ate_all_food: log.ate_all_food,
    no_stool_found: log.no_stool_found,
    stool_firm: log.stool_firm,
    stool_almost_firm: log.stool_almost_firm,
    stool_soft: log.stool_soft,
    stool_mixed: log.stool_mixed,
    stool_mushy: log.stool_mushy,
    stool_watery: log.stool_watery,
    employee_name: log.employee_name,
    comment: log.comment ?? ''
  }
}

export function sanitizeRoomLogState(state: RoomLogFormState): RoomLogUpdate {
  return {
    daypart: state.daypart,
    ate_all_food: state.ate_all_food,
    no_stool_found: state.no_stool_found,
    stool_firm: state.no_stool_found ? 0 : clampInteger(state.stool_firm),
    stool_almost_firm: state.no_stool_found ? 0 : clampInteger(state.stool_almost_firm),
    stool_soft: state.no_stool_found ? 0 : clampInteger(state.stool_soft),
    stool_mixed: state.no_stool_found ? 0 : clampInteger(state.stool_mixed),
    stool_mushy: state.no_stool_found ? 0 : clampInteger(state.stool_mushy),
    stool_watery: state.no_stool_found ? 0 : clampInteger(state.stool_watery),
    employee_name: state.employee_name.trim(),
    comment: emptyToNull(state.comment)
  }
}

export function sanitizeRoomLogPayload(roomId: string, state: RoomLogFormState): RoomLogInsert {
  return {
    room_id: roomId,
    daypart: state.daypart,
    ate_all_food: state.ate_all_food,
    no_stool_found: state.no_stool_found,
    stool_firm: state.no_stool_found ? 0 : clampInteger(state.stool_firm),
    stool_almost_firm: state.no_stool_found ? 0 : clampInteger(state.stool_almost_firm),
    stool_soft: state.no_stool_found ? 0 : clampInteger(state.stool_soft),
    stool_mixed: state.no_stool_found ? 0 : clampInteger(state.stool_mixed),
    stool_mushy: state.no_stool_found ? 0 : clampInteger(state.stool_mushy),
    stool_watery: state.no_stool_found ? 0 : clampInteger(state.stool_watery),
    employee_name: state.employee_name.trim(),
    comment: emptyToNull(state.comment)
  }
}

export function daypartLabel(daypart: string) {
  return daypart === 'evening' ? 'Abends' : 'Morgens'
}

export function inferredCurrentDaypart(reference = new Date()): Daypart {
  return reference.getHours() < 15 ? 'morning' : 'evening'
}

export function isSameCalendarDay(left: string | Date, right: string | Date) {
  const leftDate = new Date(left)
  const rightDate = new Date(right)

  return leftDate.getFullYear() === rightDate.getFullYear()
    && leftDate.getMonth() === rightDate.getMonth()
    && leftDate.getDate() === rightDate.getDate()
}

export function roomDisplayName(room: Pick<Room, 'name' | 'number'>) {
  return room.number?.trim()
    ? `${room.number} - ${room.name}`
    : room.name
}

export function sortRooms(rooms: Room[]) {
  return [...rooms].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order
    }

    return left.name.localeCompare(right.name, 'de')
  })
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

export function feedingPreview(values: string[]) {
  const compact = values
    .map(value => value.trim())
    .filter(Boolean)

  return compact.length ? compact.join(' • ') : 'Keine Angaben hinterlegt'
}

export function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function clampInteger(value: number, minimum = 0) {
  return Math.max(minimum, Math.floor(Number.isFinite(value) ? value : minimum))
}

import {
  daypartLabel,
  isSameCalendarDay,
  roomDisplayName,
  type Daypart,
  type Room,
  type RoomLogWithRoom
} from '~/utils/cat-shelter'

export type AlertSeverity = 'green' | 'yellow' | 'red'

export interface RoomIssue {
  code: string
  severity: Exclude<AlertSeverity, 'green'>
  title: string
  description: string
  detectedAt?: string
  daypart?: Daypart
}

export interface RoomAlertSummary {
  room: Room
  severity: AlertSeverity
  issues: RoomIssue[]
  latestEmployee: string | null
  latestLogAt: string | null
}

export interface WarningFeedEntry {
  room: Room
  severity: Exclude<AlertSeverity, 'green'>
  title: string
  description: string
  detectedAt: string
}

export interface PriorityCommentEntry {
  room: Room
  log: RoomLogWithRoom
  matches: string[]
}

export interface DaypartOverviewEntry {
  daypart: Daypart
  completedRooms: number
  incompleteFoodRooms: number
  noStoolRooms: number
  softStoolRooms: number
  priorityComments: number
  topRiskRooms: { room: Room, issues: number }[]
}

export interface RoomTrendSummary {
  room: Room
  entries7d: number
  incompleteFood7d: number
  noStool7d: number
  softStool7d: number
  commentCount7d: number
  latestEmployee: string | null
  latestLogAt: string | null
  editedCount7d: number
}

const PRIORITY_KEYWORDS = [
  'tierarzt',
  'erbrechen',
  'blut',
  'frisst nicht',
  'frisst kaum',
  'apathisch',
  'medikament vergessen',
  'atemnot',
  'durchfall',
  'kramp',
  'notfall'
]

function parseDate(value: string) {
  return new Date(value)
}

function hoursSince(value: string, reference: Date) {
  return (reference.getTime() - parseDate(value).getTime()) / 36e5
}

function getLogsForRoom(logs: RoomLogWithRoom[], roomId: string) {
  return logs
    .filter(log => log.room_id === roomId)
    .sort((left, right) => parseDate(right.created_at).getTime() - parseDate(left.created_at).getTime())
}

function countConsecutive(logs: RoomLogWithRoom[], predicate: (log: RoomLogWithRoom) => boolean) {
  let count = 0

  for (const log of logs) {
    if (!predicate(log)) {
      break
    }

    count += 1
  }

  return count
}

function collectPriorityMatches(comment: string | null) {
  if (!comment?.trim()) {
    return []
  }

  const lowerComment = comment.toLowerCase()
  return PRIORITY_KEYWORDS.filter(keyword => lowerComment.includes(keyword))
}

function createIssue(
  code: string,
  severity: Exclude<AlertSeverity, 'green'>,
  title: string,
  description: string,
  detectedAt?: string,
  daypart?: Daypart
): RoomIssue {
  return { code, severity, title, description, detectedAt, daypart }
}

export function analyzeRooms(rooms: Room[], logs: RoomLogWithRoom[], currentDaypart: Daypart, reference = new Date()) {
  const roomSummaries: RoomAlertSummary[] = []
  const warningFeed: WarningFeedEntry[] = []
  const priorityComments: PriorityCommentEntry[] = []
  const trendSummaries: RoomTrendSummary[] = []
  const today = reference

  for (const room of rooms) {
    const roomLogs = getLogsForRoom(logs, room.id)
    const latestLog = roomLogs[0] ?? null
    const issues: RoomIssue[] = []
    const logs7d = roomLogs.filter(log => hoursSince(log.created_at, reference) <= 24 * 7)

    const consecutiveIncompleteFood = countConsecutive(roomLogs, log => !log.ate_all_food)
    if (consecutiveIncompleteFood >= 3) {
      issues.push(createIssue(
        'food_red',
        'red',
        'Frisst seit 3 Protokollen nicht vollständig',
        `${roomDisplayName(room)} hat seit ${consecutiveIncompleteFood} Einträgen in Folge nicht vollständig gefressen.`,
        roomLogs[0]?.created_at
      ))
    } else if (consecutiveIncompleteFood >= 2) {
      issues.push(createIssue(
        'food_yellow',
        'yellow',
        'Frisst wiederholt nicht vollständig',
        `${roomDisplayName(room)} hat in ${consecutiveIncompleteFood} Protokollen in Folge nicht vollständig gefressen.`,
        roomLogs[0]?.created_at
      ))
    }

    const consecutiveNoStool = countConsecutive(roomLogs, log => log.no_stool_found)
    if (consecutiveNoStool >= 2) {
      issues.push(createIssue(
        'no_stool',
        'yellow',
        'Mehrfach kein Kot gefunden',
        `${roomDisplayName(room)} wurde in ${consecutiveNoStool} Protokollen in Folge ohne Kot dokumentiert.`,
        roomLogs[0]?.created_at
      ))
    }

    const wateryRecent = roomLogs.filter(log =>
      hoursSince(log.created_at, reference) <= 48 && (log.stool_mushy > 0 || log.stool_watery > 0)
    )

    if (wateryRecent.length >= 2) {
      issues.push(createIssue(
        'soft_red',
        'red',
        'Wässrig/Brei häuft sich',
        `${roomDisplayName(room)} hatte ${wateryRecent.length} auffällige Kot-Einträge mit Brei/Wässrig in den letzten 48 Stunden.`,
        wateryRecent[0]?.created_at
      ))
    }

    const commentBurst = roomLogs.filter(log => hoursSince(log.created_at, reference) <= 24 && log.comment?.trim())
    if (commentBurst.length >= 3) {
      issues.push(createIssue(
        'comment_burst',
        'yellow',
        'Viele Kommentare in kurzer Zeit',
        `${roomDisplayName(room)} hat ${commentBurst.length} kommentierte Einträge innerhalb von 24 Stunden.`,
        commentBurst[0]?.created_at
      ))
    }

    const currentDaypartLog = roomLogs.find(log => log.daypart === currentDaypart && isSameCalendarDay(log.created_at, today))
    if (!currentDaypartLog) {
      const overdueSeverity: Exclude<AlertSeverity, 'green'> = currentDaypart === 'morning' && reference.getHours() >= 12
        ? 'red'
        : currentDaypart === 'evening' && reference.getHours() >= 19
          ? 'red'
          : 'yellow'

      issues.push(createIssue(
        'overdue',
        overdueSeverity,
        `${daypartLabel(currentDaypart)} noch nicht protokolliert`,
        `${roomDisplayName(room)} hat für ${daypartLabel(currentDaypart)} heute noch keinen Eintrag.`,
        reference.toISOString(),
        currentDaypart
      ))
    }

    for (const log of roomLogs) {
      const matches = collectPriorityMatches(log.comment)

      if (matches.length) {
        priorityComments.push({ room, log, matches })
      }
    }

    const severity: AlertSeverity = issues.some(issue => issue.severity === 'red')
      ? 'red'
      : issues.some(issue => issue.severity === 'yellow')
        ? 'yellow'
        : 'green'

    roomSummaries.push({
      room,
      severity,
      issues,
      latestEmployee: latestLog?.employee_name ?? null,
      latestLogAt: latestLog?.created_at ?? null
    })

    trendSummaries.push({
      room,
      entries7d: logs7d.length,
      incompleteFood7d: logs7d.filter(log => !log.ate_all_food).length,
      noStool7d: logs7d.filter(log => log.no_stool_found).length,
      softStool7d: logs7d.filter(log => log.stool_mushy > 0 || log.stool_watery > 0).length,
      commentCount7d: logs7d.filter(log => log.comment?.trim()).length,
      latestEmployee: latestLog?.employee_name ?? null,
      latestLogAt: latestLog?.created_at ?? null,
      editedCount7d: logs7d.filter(log => log.updated_at && parseDate(log.updated_at).getTime() - parseDate(log.created_at).getTime() > 1000).length
    })

    for (const issue of issues) {
      warningFeed.push({
        room,
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        detectedAt: issue.detectedAt ?? reference.toISOString()
      })
    }
  }

  warningFeed.sort((left, right) => parseDate(right.detectedAt).getTime() - parseDate(left.detectedAt).getTime())

  priorityComments.sort((left, right) => parseDate(right.log.created_at).getTime() - parseDate(left.log.created_at).getTime())

  const daypartOverview: DaypartOverviewEntry[] = (['morning', 'evening'] as Daypart[]).map((daypart) => {
    const dayLogs = logs.filter(log => log.daypart === daypart && isSameCalendarDay(log.created_at, today))
    const completedRooms = new Set(dayLogs.map(log => log.room_id)).size
    const incompleteFoodRooms = new Set(dayLogs.filter(log => !log.ate_all_food).map(log => log.room_id)).size
    const noStoolRooms = new Set(dayLogs.filter(log => log.no_stool_found).map(log => log.room_id)).size
    const softStoolRooms = new Set(dayLogs.filter(log => log.stool_mushy > 0 || log.stool_watery > 0).map(log => log.room_id)).size
    const priorityCommentCount = dayLogs.filter(log => collectPriorityMatches(log.comment).length > 0).length

    const topRiskRooms = roomSummaries
      .map(summary => ({
        room: summary.room,
        issues: summary.issues.filter(issue => issue.daypart ? issue.daypart === daypart : true).length
      }))
      .filter(entry => entry.issues > 0)
      .sort((left, right) => right.issues - left.issues || left.room.sort_order - right.room.sort_order)
      .slice(0, 4)

    return {
      daypart,
      completedRooms,
      incompleteFoodRooms,
      noStoolRooms,
      softStoolRooms,
      priorityComments: priorityCommentCount,
      topRiskRooms
    }
  })

  const openIssues = roomSummaries
    .filter(summary => summary.issues.length > 0)
    .sort((left, right) => {
      const severityScore = { red: 2, yellow: 1, green: 0 }
      return severityScore[right.severity] - severityScore[left.severity]
        || left.room.sort_order - right.room.sort_order
    })

  const editedLogs = logs
    .filter(log => log.updated_at && parseDate(log.updated_at).getTime() - parseDate(log.created_at).getTime() > 1000)
    .sort((left, right) => parseDate(right.updated_at).getTime() - parseDate(left.updated_at).getTime())

  return {
    roomSummaries,
    trendSummaries,
    warningFeed,
    openIssues,
    priorityComments,
    daypartOverview,
    editedLogs
  }
}

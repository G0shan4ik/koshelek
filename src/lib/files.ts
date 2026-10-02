import { Category, Operation } from './types'
import { formatDateLong } from './format'

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCsv(operations: Operation[], currency: string): void {
  const head = ['Дата', 'Тип', 'Категория', `Сумма (${currency})`, 'Заметка']
  const rows = operations.map(o => [
    o.date,
    o.type === 'income' ? 'Доход' : 'Расход',
    o.category?.name ?? 'Без категории',
    o.amount.toFixed(2),
    o.note ?? ''
  ])
  const csv = '\uFEFF' + [head, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  download('koshelok-operations.csv', csv, 'text/csv;charset=utf-8')
}

export function exportJson(operations: Operation[], categories: Category[]): void {
  const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), categories, operations }, null, 2)
  download('koshelok-backup.json', payload, 'application/json')
}

export function importJson(file: File): Promise<{ categories: Category[]; operations: Operation[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.operations)) {
          reject(new Error('Неверный формат файла'))
          return
        }
        resolve({ categories: parsed.categories, operations: parsed.operations })
      } catch {
        reject(new Error('Файл повреждён или не является JSON'))
      }
    }
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsText(file)
  })
}

export function backupName(dateIso: string): string {
  return `koshelok-${dateIso}`
}

export { formatDateLong }

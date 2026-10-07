import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const PORT = 5199
const BASE = `http://localhost:${PORT}/`
const results = []
let failed = 0

function check(name, cond) {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failed++
}

const norm = s => (s ?? '').replace(/\u00A0/g, ' ').trim()

const envPath = path.resolve('.env.local')
const bakPath = envPath + '.e2ebak'
let envMoved = false
if (fs.existsSync(envPath)) {
  fs.renameSync(envPath, bakPath)
  envMoved = true
}

const server = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'ignore'
})

async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(BASE)
      if (r.ok) return
    } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error('dev server did not start')
}

function stopServer() {
  try {
    execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' })
  } catch {}
}

async function launchBrowser() {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true })
    } catch {}
  }
  return await chromium.launch({ headless: true })
}

try {
  await waitForServer()
  const browser = await launchBrowser()
  const page = await browser.newPage({ viewport: { width: 400, height: 850 } })
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(e.message))
  page.on('dialog', d => d.accept())

  await page.goto(BASE)
  await page.waitForSelector('.balance-card', { timeout: 20000 })
  check('главная_render', true)

  await page.click('.nav-item:has-text("Копилка")')
  await page.click('.card.empty button')
  await page.fill('.modal-sheet input.input', 'Отпуск')
  await page.fill('.modal-sheet input.input[inputmode="decimal"]', '100')
  await page.click('.modal-sheet button[type="submit"]')
  await page.waitForSelector('.piggy-card')
  check('копилка_создана_с_потолком', norm(await page.textContent('.piggy-card')).includes('Отпуск'))

  await page.click('.nav-item:has-text("Копилка")')
  await page.click('button:has-text("+ Новая копилка")')
  await page.fill('.modal-sheet input.input', 'Ноутбук')
  await page.click('.modal-sheet button[type="submit"]')
  await page.waitForSelector('.piggy-card >> nth=1')
  check('вторая_копилка_без_потолка', norm(await page.textContent('.page')).includes('Ноутбук'))

  await page.click('.nav-item:has-text("Обзор")')
  await page.click('.fab')
  await page.click('.type-toggle button:has-text("Доход")')
  await page.fill('.amount-input', '200')
  const sideInputs = page.locator('.setaside .setaside-input')
  check('отложения_сейф_плюс_две_копилки', (await sideInputs.count()) === 3)
  await sideInputs.nth(0).fill('30')
  await sideInputs.nth(1).fill('40')
  await page.click('.modal-sheet button[type="submit"]')
  await page.waitForSelector('.modal-sheet', { state: 'detached' })
  check('баланс_месяца_130', norm(await page.textContent('.balance-value')).includes('130'))

  await page.click('.nav-item:has-text("История")')
  const firstNote = norm(await page.textContent('.op-row .op-note'))
  check('доход_200_с_пометкой_отложений', firstNote.includes('из них 30 в сейф') && firstNote.includes('40 в копилку «Отпуск»'))

  await page.click('.op-row >> nth=0')
  await page.click('.modal-sheet .btn-danger:has-text("Удалить")')
  await page.waitForSelector('.snackbar')
  check('снэкбар_после_удаления', true)

  await page.click('.nav-item:has-text("Копилка")')
  check('движения_удалились_вместе_с_операцией', norm(await page.textContent('.piggy-card >> nth=0')).includes('0 ₽ из 100 ₽'))

  await page.click('.snackbar-action')
  await page.waitForSelector('.snackbar', { state: 'detached' })
  check('отмена_удаления_вернула_снэкбар', true)
  await page.click('.nav-item:has-text("Копилка")')
  check('отмена_вернула_движения_копилки', norm(await page.textContent('.piggy-card >> nth=0')).includes('40 ₽ из 100 ₽'))

  await page.click('.nav-item:has-text("История")')
  await page.click('.op-row >> nth=0')
  await page.click('.modal-sheet .btn-danger:has-text("Удалить")')
  await page.waitForSelector('.snackbar')
  await page.waitForSelector('.snackbar', { state: 'detached', timeout: 12000 })
  check('снэкбар_исчез_через_8_секунд', true)
  check('операция_не_вернулась_после_истечения', (await page.locator('.op-row').count()) === 0)

  await page.click('.nav-item:has-text("Обзор")')
  await page.click('.fab')
  await page.click('.type-toggle button:has-text("Доход")')
  await page.fill('.amount-input', '200')
  const side2 = page.locator('.setaside .setaside-input')
  await side2.nth(0).fill('30')
  await side2.nth(1).fill('40')
  await page.click('.modal-sheet button[type="submit"]')
  await page.waitForSelector('.modal-sheet', { state: 'detached' })

  await page.click('.nav-item:has-text("Копилка")')
  await page.locator('.piggy-card', { hasText: 'Отпуск' }).getByRole('button', { name: 'Пополнить' }).click()
  await page.fill('.amount-input', '60')
  await page.click('.modal-sheet button[type="submit"]')
  await page.waitForSelector('.modal-sheet', { state: 'detached' })
  const piggyText = norm(await page.locator('.piggy-card', { hasText: 'Отпуск' }).textContent())
  check('копилка_100_из_100_и_100_процентов', piggyText.includes('100 ₽ из 100 ₽') && piggyText.includes('100%'))

  await page.locator('.piggy-card', { hasText: 'Отпуск' }).getByLabel('Изменить копилку').click()
  await page.click('.modal-sheet button:has-text("Разбить копилку")')
  await page.waitForSelector('.modal-sheet', { state: 'detached' })
  check('копилка_в_архиве_разбита', norm(await page.textContent('.closed-row')).includes('Отпуск') && norm(await page.textContent('.closed-row')).includes('разбита'))

  await page.click('.nav-item:has-text("История")')
  const breakRow = page.locator('.op-row', { hasText: 'Копилка: Отпуск' })
  check('расход_при_разбиве_100', norm(await breakRow.first().textContent()).includes('−100'))

  await page.click('.nav-item:has-text("Обзор")')
  check('баланс_после_разбива_70', norm(await page.textContent('.balance-value')).includes('70'))

  await page.click('.nav-item:has-text("Настройки")')
  await page.click('.segmented button:has-text("Сейф")')
  check('сейф_30', norm(await page.textContent('.balance-value')).includes('30'))
  await page.click('button:has-text("Достать")')
  await page.fill('.amount-input', '10')
  await page.click('.modal-sheet button[type="submit"]')
  await page.waitForSelector('.modal-sheet', { state: 'detached' })
  check('сейф_20_после_снятия', norm(await page.textContent('.balance-value')).includes('20'))

  await page.click('.nav-item:has-text("Обзор")')
  await page.click('.fab')
  await page.fill('.amount-input', '50')
  await page.fill('.modal-sheet input[type="date"]', '2025-03-10')
  await page.click('.modal-sheet button[type="submit"]')
  await page.waitForSelector('.modal-sheet', { state: 'detached' })

  await page.click('.nav-item:has-text("Отчёты")')
  await page.click('.period-seg button:has-text("Год")')
  const reportsText = norm(await page.textContent('.page'))
  check(
    'отчеты_год_месяцы_и_годы',
    reportsText.includes('Динамика по месяцам') && reportsText.includes('Динамика по годам')
  )

  check('нет_ошибок_в_консоли', pageErrors.length === 0)
  if (pageErrors.length > 0) results.push('pageerrors: ' + pageErrors.join(' | '))

  await browser.close()
} catch (e) {
  failed++
  results.push('CRASH  ' + e.message)
} finally {
  stopServer()
  if (envMoved && fs.existsSync(bakPath)) fs.renameSync(bakPath, envPath)
}

console.log(results.join('\n'))
console.log(failed === 0 ? 'ALL TESTS PASSED' : `FAILURES: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

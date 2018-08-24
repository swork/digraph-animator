const da = require('..')
const fs = require('fs')

const egs = []

beforeAll(() => {
    const eg_dir = __dirname + '/../eg/'
    const eg_filenames = fs.readdirSync(eg_dir)
    for (idx in eg_filenames) {
        console.log(eg_filenames[idx])
        egs.push(JSON.parse(fs.readFileSync(eg_dir + eg_filenames[idx], 'utf8')))
    }
})

afterAll(() => {
})

test('always succeed', () => {
  expect(1).toBe(1)
})

test('all are arrays', () => {
    for (idx in egs) {
        expect(egs[idx]).toEqual(expect.arrayContaining([]))
    }
})

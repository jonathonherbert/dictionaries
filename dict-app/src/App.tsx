import React, {useState} from 'react'
import logo from './logo.svg'
import './App.css'
import raw from 'raw.macro'

const dict = raw('../../dictionaries/en-GB/index.dic')
const aff = raw('../../dictionaries/en-GB/index.aff')

const [count, ...lines] = dict.split('\n')

type Entry = {word: string; affChars: string[]; index: number}
type Affix = {
  type: string
  key: string
  stripChars: string
  affix: string
  regex: string
}

const entries: Entry[] = lines
  .map((entry, index) => {
    const [word, affChars] = entry.split('/')
    return {word, affChars: (affChars || '').split(''), index}
  })
  .filter(({word}) => word)

const affixes = aff
  .split('\n')
  .filter((line) => line.substr(1, 3).includes('FX'))
  .reduce(
    ({isCombineable, affixes}, line) => {
      const combineableChar = line.substr(6, 7)
      const isAffixHeader = ['Y', 'N'].includes(combineableChar)
      if (isAffixHeader) {
        return {
          isCombineable: combineableChar,
          affixes
        }
      }
      const [type, key, stripChars, affix, regex] = line
        .split(' ')
        .filter((_) => _)
      const newAffix = {type, key, stripChars, affix, regex, isCombineable}
      return {
        isCombineable,
        affixes: [...affixes, newAffix]
      }
    },
    {isCombineable: 'N', affixes: [] as Affix[]}
  ).affixes

const filterEntries = (searchStr: string) => {
  const filteredEntries =
    searchStr.length > 1
      ? entries.filter(({word}) => word.includes(searchStr))
      : entries
  const firstSearchChar = searchStr.substr(0, 1)
  return filteredEntries.sort(({word}) =>
    word.substr(0, 1) === firstSearchChar ? -1 : 0
  )
}

function App() {
  const [searchStr, setSearchStr] = useState('poly')
  const sortedEntries = filterEntries(searchStr)
  return (
    <>
      <div className="App">
        <h2>Dictionary search</h2>
        <div className="row">
          <div className="col">
            <h3>{count} entries</h3>
            <input
              type="text"
              value={searchStr}
              onChange={(e) => setSearchStr(e.target.value)}
            ></input>
            {sortedEntries.slice(0, 10).map(Word)}
          </div>
          <div className="col col-right">
            <h3>Affixes</h3>
            {affixes.map(({type, key, stripChars, affix, regex}) => (
              <p key={`${key}-${regex}`}>{`${type}
              ${key}
              ${stripChars}
              ${affix}
              ${regex}`}</p>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function Word({word, affChars, index}: Entry) {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <div onClick={() => setIsOpen(!isOpen)} key={word}>
      <p>{`${index}: ${word} ${affChars ? `/ ${affChars}` : ''}`}</p>
      {isOpen && <div>{getAffixesFromEntry({word, affChars, index})}</div>}
    </div>
  )
}

function getAffixesFromEntry({word, affChars, index}: Entry) {
  const affs = affChars
    .map((affChar) => affixes.find(({key}) => key === affChar))
    .filter((_) => _)

  return (affs as Affix[]).map((_) => Object.values(_).join(' '))
}

export default App

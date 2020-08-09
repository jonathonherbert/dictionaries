import React, { useState } from "react";
import "./App.css";
import Typo from "typo-js";
import raw from "raw.macro";

const dict = raw(`../../dictionaries/en-GB/index.dic`);
const aff = raw(`../../dictionaries/en-GB/index.aff`);

const [count, ...lines] = dict.split("\n");
const typo = new Typo("en_GB", aff, dict);

type DictionaryEntry = { word: string; affChars: string[]; lineNo: number };
type AffixEntry = {
  type: string;
  key: string;
  stripChars: string;
  affix: string;
  regex: string;
};

const entries: DictionaryEntry[] = lines
  .map((entry, index) => {
    const [word, affChars] = entry.split("/");
    // lineN + 2 – 0-index plus summary line in .dic file
    return { word, affChars: (affChars || "").split(""), lineNo: index + 2 };
  })
  .filter(({ word }) => word);

const affixes = aff
  .split("\n")
  .filter((line) => line.substr(1, 3).includes("FX"))
  .reduce(
    ({ isCombineable, affixes }, line) => {
      const combineableChar = line.substr(6, 7);
      const isAffixHeader = ["Y", "N"].includes(combineableChar);

      if (isAffixHeader) {
        // Use the affix header to carry the combineable state to the next iteration.
        return {
          isCombineable: combineableChar,
          affixes,
        };
      }

      const [type, key, stripChars, affix, regex] = line
        .split(" ")
        .filter((_) => _);
      const newAffix: AffixEntry = { type, key, stripChars, affix, regex };

      return {
        isCombineable,
        affixes: [...affixes, newAffix],
      };
    },
    { isCombineable: "N", affixes: [] as AffixEntry[] }
  ).affixes;

const filterEntries = (searchStr: string) => {
  const filteredEntries =
    searchStr.length > 1
      ? entries.filter(({ word }) => word.includes(searchStr))
      : entries;
  const firstSearchChar = searchStr.substr(0, 1);
  return filteredEntries.sort(({ word: wordA }, { word: wordB }) => {
    if (wordA === searchStr) {
      // Exact match – hoist
      return -1;
    }

    if (
      wordA.substr(0, 1) === firstSearchChar &&
      wordB.substr(0, 1) !== firstSearchChar
    ) {
      // Begins with first search char - hoist
      return -1;
    }

    // Smaller matches first
    return wordA.length < wordB.length ? -1 : 0;
  });
};

function App() {
  const [searchStr, setSearchStr] = useState("poly");
  const sortedEntries = filterEntries(searchStr);
  return (
    <>
      <div className="App">
        <div className="row">
          <div className="col">
            <h2>Hunspell dictionary search</h2>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <h3>{count} entries</h3>
            <input
              type="text"
              value={searchStr}
              onChange={(e) => setSearchStr(e.target.value)}
            ></input>
            {sortedEntries.slice(0, 10).map((entry) => (
              <Word key={entry.lineNo} {...entry} searchStr={searchStr} />
            ))}
          </div>
          <div className="col col-right">
            <h3>All affixes</h3>
            {affixes.map(({ type, key, stripChars, affix, regex }) => (
              <p key={`${key}-${regex}`}>{`${type}
              ${key}
              ${stripChars}
              ${affix}
              ${regex || ""}`}</p>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Word({
  word,
  affChars,
  lineNo: index,
  searchStr,
}: DictionaryEntry & { searchStr: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const searchStrIndex = word.indexOf(searchStr);
  const searchPrefix = word.slice(0, searchStrIndex);
  const searchSuffix = word.slice(searchStrIndex + searchStr.length, word.length);
  return (
    <div className="Word" onClick={() => setIsOpen(!isOpen)} key={word}>
      <p>
        {searchPrefix}
        <span className="Word__search-match">{searchStr}</span>
        {searchSuffix}
        <span className="Word__meta">
          &nbsp;/&nbsp;
          <span>{affChars.length ? `Affixes: ${affChars.join("")}, ` : ""}</span>
          <span>Line: {index}</span>
        </span>
      </p>
      {isOpen && <div>{renderAffixesFromEntry({ word, affChars, lineNo: index })}</div>}
    </div>
  );
}

function renderAffixesFromEntry({ word }: DictionaryEntry) {
  const affs = typo.ruleToAffixMap.get(word);
  if (!affs) return null;

  const tableBody = affs.flatMap((aff: any) =>
    Array.from(aff).flatMap(([rule, entries]: any) => {
      const renderedRule = renderRule(rule);
      return entries.map((entry: any) => (
        <tr key={entry.newWord}>
          <td className="Affix__new-word">{entry.newWord}</td>
          <td className="Affix__rule-affix">{renderedRule} </td>
          <td className="Affix__rule-add">
            {entry.entry.add && `+${entry.entry.add}`}
          </td>
          <td className="Affix__rule-remove">
            {entry.entry.remove && `-${entry.entry.remove}`}
          </td>
          <td className="Affix__rule-match">
            {entry.entry?.match?.toString()}
          </td>
        </tr>
      ));
    })
  );

  return (
    <table>
      <thead>
        <tr>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <tbody>{tableBody}</tbody>
    </table>
  );
}

const renderRule = (rule: any) => (
  <span className="Affix__rule">
    {rule.type}
    {rule.combineable ? ", combineable" : ""}
  </span>
);

export default App;

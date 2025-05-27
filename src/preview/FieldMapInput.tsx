// import { Input } from "@/components/ui/input";
import clsx from "clsx";
import { FC, useEffect, useLayoutEffect, useState } from "react";

const literalRegex = /^".+"$/;

const Chip: FC<{ text: string }> = ({ text }) => {
  return <div className="p-1 bg-blue-300 rounded-md chip">{text}</div>;
};

export const FieldMapInput: FC<{ rawFieldsList: string[] }> = ({
  rawFieldsList,
}) => {
  const [text, setText] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const operatorsOptions = ["+"];
  const options = [...operatorsOptions, ...rawFieldsList];
  const [chipsWrapperWidth, setChipsWrapperWidth] = useState(0);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().startsWith(text.toLowerCase())
  );

  useLayoutEffect(() => {
    const chipsWrapper = document.getElementById("chipsWrapper");
    setChipsWrapperWidth(chipsWrapper?.getBoundingClientRect().width || 0);
  }, [chips]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [text]);

  return (
    <div className="flex relative outline-1 outline-red-500 items-center border border-red-100 z-50">
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();

          switch (event.key) {
            case "ArrowDown":
              if (selectedIndex >= filteredOptions.length - 1) {
                break;
              }

              setSelectedIndex((old) => old + 1);
              break;
            case "ArrowUp":
              if (selectedIndex - 1 < -1) {
                break;
              }
              setSelectedIndex((old) => old - 1);

              break;
            case "Tab":
            case "Enter":
              event.preventDefault();
              if (literalRegex.test(text)) {
                setChips((old) => [...old, text]);
                setText("");
                return;
              } else if (selectedIndex === -1 || !options) {
                return;
              } else {
                setChips((old) => [...old, filteredOptions[selectedIndex]]);
                setText("");
              }

              break;

            case "Esc":
              setSelectedIndex(-1);
              break;

            case "Backspace":
              if (chips.length > 0 && text.length === 0) {
                event.preventDefault();
                setChips((old) => {
                  const newChips = [...old];
                  newChips.pop();

                  return newChips;
                });
              }
              break;
          }
        }}
        className={`pr-2 h-10 outline-hidden w-full peer`}
        style={{ paddingLeft: chipsWrapperWidth + 8 }}
      />
      <div id="chipsWrapper" className="absolute flex gap-1">
        {chips.map((chip, index) => {
          return <Chip key={index} text={chip} />;
        })}
      </div>
      {filteredOptions.length ? (
        <div
          className="px-1 min-w-[100px] bg-white border border border-black z-50 hidden peer-focus:block"
          style={{
            position: "absolute",
            left: chipsWrapperWidth + 8,
            top: "calc(50% + 20px)",
          }}
        >
          <ul>
            {filteredOptions.map((option, index) => (
              <li
                key={option}
                className={clsx({ "bg-red-50": index === selectedIndex })}
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

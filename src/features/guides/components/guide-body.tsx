import type { GuideBlock } from "@/features/guides/guides";

export function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="flex flex-col gap-4 text-base leading-relaxed">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={index} className="mt-4 text-xl font-semibold">
                {block.text}
              </h2>
            );
          case "p":
            return <p key={index}>{block.text}</p>;
          case "ul":
            return (
              <ul key={index} className="flex list-disc flex-col gap-2 pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="flex list-decimal flex-col gap-2 pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}

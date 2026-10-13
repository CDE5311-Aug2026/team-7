import { useEffect, useId, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { FileItem } from "./model";

const iconAssets: Record<string, string> = {
  spark: "imgGroup2",
  folder: "imgGroup3",
  list: "imgGroup4",
  history: "imgGroup5",
  sliders: "imgGroup6",
  computer: "imgGroup7",
  cloud: "imgGroup8",
  settings: "imgGroup9",
  search: "imgGroup10",
  check: "imgGroup16",
  file: "imgGroup19",
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const asset = iconAssets[name];
  return (
    <span
      className="icon"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {asset ? (
        <img src={`./assets/${asset}.svg`} alt="" />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {name === "arrow" ? (
            <path d="M5 12h14m-5-5 5 5-5 5" />
          ) : name === "close" ? (
            <path d="m6 6 12 12M6 18 18 6" />
          ) : name === "chevron" ? (
            <path d="m8 5 7 7-7 7" />
          ) : name === "down" ? (
            <path d="m6 9 6 6 6-6" />
          ) : name === "grid" ? (
            <>
              <rect x="4" y="4" width="6" height="6" rx="1" />
              <rect x="14" y="4" width="6" height="6" rx="1" />
              <rect x="4" y="14" width="6" height="6" rx="1" />
              <rect x="14" y="14" width="6" height="6" rx="1" />
            </>
          ) : name === "archive" ? (
            <>
              <rect x="3" y="4" width="18" height="5" rx="1" />
              <path d="M5 9v11h14V9m-10 4h6" />
            </>
          ) : name === "trash" ? (
            <>
              <path d="M4 6h16M9 6V3h6v3M6 6l1 14h10l1-14M10 10v6m4-6v6" />
            </>
          ) : name === "info" ? (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5m0-9v1" />
            </>
          ) : name === "restore" ? (
            <>
              <path d="M3 10h5M3 10V5m0 5a9 9 0 1 1 1 7M12 7v5l3 2" />
            </>
          ) : name === "shield" ? (
            <>
              <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
              <path d="m8 12 3 3 5-6" />
            </>
          ) : name === "download" ? (
            <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
          ) : (
            <path d="M12 5v14M5 12h14" />
          )}
        </svg>
      )}
    </span>
  );
}
const layers: { asset: string; inset: string; rotate?: number }[] = [
  { asset: "imgVector", inset: "82.78% 23.75% 10.56% 27.08%" },
  { asset: "imgGroup", inset: "11.89% 20.32% 7.89% 24.23%", rotate: 7 },
  { asset: "imgVector1", inset: "15.56% 25.42% 12.22% 23.75%" },
  { asset: "imgVector2", inset: "22.22% 51.25% 75.56% 29.17%" },
  { asset: "imgVector3", inset: "27.22% 40.83% 71.67% 29.17%" },
  { asset: "imgVector4", inset: "33.33% 46.25% 37.22% 29.17%" },
  { asset: "imgGroup1", inset: "34.14% 45.8% 37.74% 29.58%", rotate: -23 },
  { asset: "imgVector5", inset: "33.33% 30.83% 53.33% 57.08%" },
  { asset: "imgVector6", inset: "35% 30.83% 53.33% 57.08%" },
  { asset: "imgVector7", inset: "50% 30.83% 37.22% 57.08%" },
  { asset: "imgVector8", inset: "52.29% 32.5% 39.44% 58.75%" },
  ...["imgVector9", "imgVector10", "imgVector11", "imgVector12"].map(
    (asset, i) => ({
      asset,
      inset: `67.22% ${[63.33, 53.75, 44.17, 30.83][i]}% 28.33% ${[29.17, 38.75, 48.33, 57.92][i]}%`,
    }),
  ),
  { asset: "imgVector13", inset: "77.22% 31.25% 21.67% 29.17%" },
  { asset: "imgVector14", inset: "80.56% 43.33% 18.33% 29.17%" },
];
export function Preview({
  file,
  large = false,
}: {
  file: FileItem;
  large?: boolean;
}) {
  const assets = {
    orbit7: "imgVectorIllustrationOrbitV07",
    orbit3: "imgVectorIllustrationOrbitV03",
    reference: "imgVectorIllustrationReferenceBoard",
    motion: "imgVectorIllustrationMotionNetwork",
  };
  return (
    <div
      className={`file-preview ${file.preview} category-${file.category.toLowerCase()} ${large ? "large" : ""}`}
    >
      {file.preview !== "generic" ? (
        <>
          <img
            className="preview-art"
            src={`./assets/${assets[file.preview]}.svg`}
            alt=""
          />
          {file.preview === "reference" &&
            layers.map((l, i) => (
              <span
                key={i}
                className="reference-layer"
                style={
                  { inset: l.inset, containerType: "size" } as CSSProperties
                }
              >
                <img
                  src={`./assets/${l.asset}.svg`}
                  style={
                    l.rotate
                      ? {
                          transform: `rotate(${l.rotate}deg)`,
                          width:
                            l.rotate === 7
                              ? "hypot(88.004cqw,9.95851cqh)"
                              : "hypot(77.6218cqw,-38.4606cqh)",
                          height:
                            l.rotate === 7
                              ? "hypot(-11.996cqw,90.0415cqh)"
                              : "hypot(22.3782cqw,61.5394cqh)",
                        }
                      : undefined
                  }
                  alt=""
                />
              </span>
            ))}
        </>
      ) : (
        <div className="generic-art">
          <Icon
            name={
              file.category === "Research"
                ? "file"
                : file.category === "Sources"
                  ? "folder"
                  : file.category === "Motion"
                    ? "list"
                    : "grid"
            }
            size={38}
          />
          <span>{file.name.split(".").pop()?.toUpperCase()}</span>
        </div>
      )}
      <div className="preview-badges">
        <span>
          {file.category === "Sources"
            ? "SOURCE FILE"
            : file.category === "Motion"
              ? "MOTION"
              : file.category === "Research"
                ? "DOCUMENT"
                : "RENDER"}
        </span>
        <span>
          {file.name.match(/v\d+/)?.[0] ||
            file.name.split(".").pop()?.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = ref.current!;
    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      );
    focusable()[0]?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    panel.addEventListener("keydown", handler);
    return () => {
      panel.removeEventListener("keydown", handler);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header className="modal-header">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Empty({
  title,
  text,
  children,
  icon = "search",
}: {
  title: string;
  text: string;
  children?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={30} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}

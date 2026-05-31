"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// ─── Context ───────────────────────────────────────────────────────────────
interface DrawerContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const DrawerContext = React.createContext<DrawerContextValue>({
  open: false,
  onOpenChange: () => {},
});

// ─── Drawer Root ───────────────────────────────────────────────────────────
interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Drawer = ({ open, onOpenChange, children }: DrawerProps) => {
  // Lock body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <DrawerContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DrawerContext.Provider>
  );
};

// ─── Drawer Content (Panel + Overlay via Portal) ────────────────────────────
interface DrawerContentProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ children, style }, ref) => {
    const { open, onOpenChange } = React.useContext(DrawerContext);
    const [mounted, setMounted] = React.useState(false);

    // Only mount portal on client
    React.useEffect(() => { setMounted(true); }, []);

    if (!mounted) return null;

    return createPortal(
      <>
        {/* Backdrop overlay — click to close */}
        <div
          onClick={() => onOpenChange(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(0,0,0,0.18)",
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transition: "opacity 0.22s ease",
          }}
        />

        {/* Slide-in Panel */}
        <div
          ref={ref}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            width: "100%",
            maxWidth: 720,
            background: "#fff",
            borderLeft: "1px solid #eee",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            transform: open ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform",
            overflowY: "auto",
            padding: 24,
            ...(style || {}),
          }}
        >
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#bbb",
              padding: 4,
              borderRadius: 6,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#111"; e.currentTarget.style.background = "#f5f5f5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#bbb"; e.currentTarget.style.background = "transparent"; }}
            aria-label="Close"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>

          {children}
        </div>
      </>,
      document.body
    );
  }
);
DrawerContent.displayName = "DrawerContent";

// ─── Drawer Sub-Components ──────────────────────────────────────────────────

const DrawerHeader = ({
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      textAlign: "left",
      borderBottom: "1px solid #f0f0f0",
      paddingBottom: 16,
      ...(style || {}),
    }}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      borderTop: "1px solid #f0f0f0",
      paddingTop: 16,
      marginTop: "auto",
      ...(style || {}),
    }}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

interface DrawerTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  style?: React.CSSProperties;
}
const DrawerTitle = ({ style, ...props }: DrawerTitleProps) => (
  <h2
    style={{
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 1.2,
      color: "#111",
      margin: 0,
      ...(style || {}),
    }}
    {...props}
  />
);
DrawerTitle.displayName = "DrawerTitle";

interface DrawerDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  style?: React.CSSProperties;
}
const DrawerDescription = ({ style, ...props }: DrawerDescriptionProps) => (
  <p
    style={{
      fontSize: 13,
      color: "#888",
      margin: 0,
      marginTop: 6,
      ...(style || {}),
    }}
    {...props}
  />
);
DrawerDescription.displayName = "DrawerDescription";

// ─── Exports ────────────────────────────────────────────────────────────────
export {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};

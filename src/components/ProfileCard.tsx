type ProfileCardProps = {
  caption: string;
  captionColor?: string;
  children: React.ReactNode;
};

export default function ProfileCard({
  caption,
  captionColor,
  children,
}: ProfileCardProps) {
  return (
    <div className="card">
      <span
        className="caption"
        style={captionColor ? { color: captionColor } : undefined}
      >
        {caption}
      </span>
      <div style={{ marginTop: "var(--space-4)" }}>{children}</div>
    </div>
  );
}

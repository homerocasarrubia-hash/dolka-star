export default function CheckeredDivider() {
  return (
    <div
      className="w-full h-6"
      style={{
        backgroundImage:
          "repeating-conic-gradient(#E2393C 0% 25%, #EEE7D4 0% 50%)",
        backgroundSize: "24px 24px",
      }}
      aria-hidden="true"
    />
  );
}

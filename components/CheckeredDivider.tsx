export default function CheckeredDivider() {
  return (
    <div
      className="w-full h-8"
      style={{
        backgroundColor: "#E2393C",
        backgroundImage: [
          "linear-gradient(45deg, #EEE7D4 25%, transparent 25%)",
          "linear-gradient(-45deg, #EEE7D4 25%, transparent 25%)",
          "linear-gradient(45deg, transparent 75%, #EEE7D4 75%)",
          "linear-gradient(-45deg, transparent 75%, #EEE7D4 75%)",
        ].join(", "),
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
      }}
      aria-hidden="true"
    />
  );
}

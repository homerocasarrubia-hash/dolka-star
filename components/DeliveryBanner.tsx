export default function DeliveryBanner() {
  return (
    <div className="bg-red-primary text-white text-center py-5 px-4">
      <p className="font-display text-2xl md:text-3xl leading-tight">
        Llegamos a todo Andalgalá
      </p>
      <p className="font-body text-sm md:text-base text-white/80 mt-1 mb-4">
        Hacé tu pedido por WhatsApp
      </p>
      <a
        href="https://wa.me/5493835517049"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-white text-red-primary font-display text-base px-6 py-2 rounded hover:bg-cream transition-colors"
      >
        PEDIR AHORA
      </a>
    </div>
  );
}

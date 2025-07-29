import { useEffect, useState } from 'react';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export default function LiquidBubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    const generateBubbles = () => {
      const newBubbles: Bubble[] = [];
      const count = 15; // Number of bubbles

      for (let i = 0; i < count; i++) {
        newBubbles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 100 + 50, // 50-150px
          duration: Math.random() * 20 + 10, // 10-30s
          delay: Math.random() * 5, // 0-5s delay
        });
      }

      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="liquid-bubble"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
          }}
        >
          {/* Inner glossy reflection */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, transparent 40%)`,
            }}
          />
          
          {/* Secondary reflection */}
          <div 
            className="absolute bottom-2 right-2 w-1/3 h-1/3 rounded-full"
            style={{
              background: `radial-gradient(circle at center, rgba(255, 255, 255, 0.6) 0%, transparent 70%)`,
              filter: 'blur(2px)',
            }}
          />
        </div>
      ))}

      {/* Static decorative bubbles */}
      <div 
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      
      <div 
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle at 70% 70%, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
          filter: 'blur(80px)',
        }}
      />
    </div>
  );
}
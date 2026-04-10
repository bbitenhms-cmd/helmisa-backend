import React, { useRef, useEffect, useState } from 'react';

const RadarView = ({ users, currentUser, onUserClick }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);

  const getVibeColor = (vibe) => {
    const colors = {
      chill: '#3B82F6',      // blue
      energetic: '#F59E0B',  // orange
      romantic: '#EC4899',   // pink
      social: '#8B5CF6'      // purple
    };
    return colors[vibe] || '#9CA3AF';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Background circles (distance rings)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (maxRadius / 3) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Distance labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('20m', centerX, centerY - (maxRadius / 3) + 15);
      ctx.fillText('40m', centerX, centerY - (maxRadius / 3) * 2 + 15);
      ctx.fillText('60m', centerX, centerY - maxRadius + 15);

      // Radar sweep (rotating line with gradient)
      const gradient = ctx.createLinearGradient(
        centerX,
        centerY,
        centerX + Math.cos(rotation) * maxRadius,
        centerY + Math.sin(rotation) * maxRadius
      );
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.7)');

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(rotation) * maxRadius,
        centerY + Math.sin(rotation) * maxRadius
      );
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Sweep trail (arc behind the line)
      const trailGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        maxRadius
      );
      trailGradient.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
      trailGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, rotation - Math.PI / 4, rotation);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = trailGradient;
      ctx.fill();

      // Draw users as dots
      users.forEach((user) => {
        // Random position for demo (in real app, use actual location)
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * maxRadius * 0.8 + maxRadius * 0.1;
        
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        // Outer glow
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
        const color = getVibeColor(user.user.vibe);
        glowGradient.addColorStop(0, color + 'AA');
        glowGradient.addColorStop(1, color + '00');
        
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Pulse ring
        const pulseSize = 8 + Math.sin(Date.now() / 500 + user.table_number) * 3;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = color + '80';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Center dot (current user)
      const centerGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        12
      );
      centerGradient.addColorStop(0, '#3B82F6');
      centerGradient.addColorStop(1, '#1D4ED8');

      ctx.beginPath();
      ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
      ctx.fillStyle = centerGradient;
      ctx.fill();
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Rotate radar
      setRotation((prev) => (prev + 0.02) % (Math.PI * 2));
    };

    const animationId = setInterval(animate, 1000 / 60); // 60 FPS

    return () => clearInterval(animationId);
  }, [users, rotation]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(canvas.width, canvas.height) / 2 - 20;

    // Check if clicked on a user dot
    users.forEach((user) => {
      // Same random logic as drawing (should be stored in state in production)
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * maxRadius * 0.8 + maxRadius * 0.1;
      
      const dotX = centerX + Math.cos(angle) * distance;
      const dotY = centerY + Math.sin(angle) * distance;

      const dist = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);
      if (dist < 15) {
        onUserClick(user);
      }
    });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        onClick={handleCanvasClick}
        className="cursor-pointer"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-lg rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2 text-white text-xs">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Sen</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span>Sosyal</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs">
          <div className="w-3 h-3 rounded-full bg-pink-500"></div>
          <span>Romantik</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Enerjik</span>
        </div>
        <div className="flex items-center gap-2 text-white text-xs">
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <span>Sakin</span>
        </div>
      </div>

      {/* Info */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2">
        <p className="text-white text-sm font-semibold">{users.length} kullanıcı tespit edildi</p>
      </div>
    </div>
  );
};

export default RadarView;

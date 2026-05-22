import { useState, useRef, useCallback, useEffect } from 'react';

interface EnhancementSettings {
  sharpness: number;
  contrast: number;
  brightness: number;
  saturation: number;
}

const defaultSettings: EnhancementSettings = {
  sharpness: 0,
  contrast: 0,
  brightness: 0,
  saturation: 0,
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<EnhancementSettings>(defaultSettings);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setEnhancedImage(null);
        setSettings(defaultSettings);
        setSliderPosition(50);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const applyEnhancements = useCallback(() => {
    if (!image || !canvasRef.current) return;

    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply brightness
      const brightnessValue = settings.brightness * 2.55;

      // Apply contrast
      const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));

      // Apply saturation
      const saturationValue = settings.saturation / 100 + 1;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        r += brightnessValue;
        g += brightnessValue;
        b += brightnessValue;

        // Contrast
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        // Saturation
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + saturationValue * (r - gray);
        g = gray + saturationValue * (g - gray);
        b = gray + saturationValue * (b - gray);

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);

      // Apply sharpening using convolution
      if (settings.sharpness > 0) {
        const sharpnessStrength = settings.sharpness / 100;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(canvas, 0, 0);

        const srcData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const destData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const kernel = [
          0, -sharpnessStrength, 0,
          -sharpnessStrength, 1 + 4 * sharpnessStrength, -sharpnessStrength,
          0, -sharpnessStrength, 0
        ];

        const width = canvas.width;
        const height = canvas.height;

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                  sum += srcData.data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
              }
              destData.data[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum));
            }
          }
        }

        ctx.putImageData(destData, 0, 0);
      }

      setEnhancedImage(canvas.toDataURL('image/png'));
      setIsProcessing(false);
    };
    img.src = image;
  }, [image, settings]);

  useEffect(() => {
    if (image) {
      const debounce = setTimeout(applyEnhancements, 150);
      return () => clearTimeout(debounce);
    }
  }, [image, settings, applyEnhancements]);

  const handleSliderMove = useCallback((clientX: number) => {
    if (!comparisonRef.current) return;
    const rect = comparisonRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleSliderMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    handleSliderMove(e.touches[0].clientX);
  };

  const handleDownload = () => {
    if (!enhancedImage) return;
    const link = document.createElement('a');
    link.download = 'enhanced-image.png';
    link.href = enhancedImage;
    link.click();
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  const updateSetting = (key: keyof EnhancementSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="border-b border-neutral-200 px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-serif text-xl md:text-2xl text-neutral-900 tracking-tight">
            Image Enhancement
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Sharpen and enhance your images
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-6xl mx-auto">
          {!image ? (
            // Upload Area
            <div
              className="border border-dashed border-neutral-300 rounded-sm bg-neutral-50 py-16 md:py-24 px-4 text-center cursor-pointer hover:border-neutral-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-neutral-400 mb-4">
                <svg className="w-10 h-10 md:w-12 md:h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-neutral-600 text-sm md:text-base">
                Click to upload an image
              </p>
              <p className="text-neutral-400 text-xs md:text-sm mt-1">
                or drag and drop
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 md:gap-10">
              {/* Image Comparison */}
              <div className="order-2 lg:order-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-neutral-400 uppercase tracking-wider">Preview</span>
                  {isProcessing && (
                    <span className="text-xs text-neutral-500">Processing...</span>
                  )}
                </div>

                <div
                  ref={comparisonRef}
                  className="relative overflow-hidden rounded-sm bg-neutral-100 select-none touch-none"
                  onMouseMove={handleMouseMove}
                  onTouchMove={handleTouchMove}
                >
                  {/* Original Image */}
                  <img
                    src={image}
                    alt="Original"
                    className="w-full h-auto block"
                    draggable={false}
                  />

                  {/* Enhanced Image Overlay */}
                  {enhancedImage && (
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${sliderPosition}%` }}
                    >
                      <img
                        src={enhancedImage}
                        alt="Enhanced"
                        className="h-full object-cover object-left"
                        style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
                        draggable={false}
                      />
                    </div>
                  )}

                  {/* Slider Handle */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-white cursor-ew-resize"
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-md flex items-center justify-center">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 text-xs text-neutral-600 rounded-sm">
                    Enhanced
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-white/90 text-xs text-neutral-600 rounded-sm">
                    Original
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 text-sm text-neutral-600 border border-neutral-200 rounded-sm hover:bg-neutral-50 transition-colors"
                  >
                    Change image
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={!enhancedImage}
                    className="px-4 py-2.5 text-sm text-neutral-900 bg-neutral-100 rounded-sm hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    Download
                  </button>
                </div>
              </div>

              {/* Controls Panel */}
              <div className="order-1 lg:order-2">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-neutral-400 uppercase tracking-wider">Adjustments</span>
                  <button
                    onClick={handleReset}
                    className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-6 lg:space-y-8">
                  <SliderControl
                    label="Sharpness"
                    value={settings.sharpness}
                    onChange={(v) => updateSetting('sharpness', v)}
                    min={0}
                    max={100}
                  />
                  <SliderControl
                    label="Contrast"
                    value={settings.contrast}
                    onChange={(v) => updateSetting('contrast', v)}
                    min={-50}
                    max={50}
                  />
                  <SliderControl
                    label="Brightness"
                    value={settings.brightness}
                    onChange={(v) => updateSetting('brightness', v)}
                    min={-50}
                    max={50}
                  />
                  <SliderControl
                    label="Saturation"
                    value={settings.saturation}
                    onChange={(v) => updateSetting('saturation', v)}
                    min={-100}
                    max={100}
                  />
                </div>

                {/* Presets */}
                <div className="mt-8 pt-6 border-t border-neutral-100">
                  <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-4">Presets</span>
                  <div className="grid grid-cols-2 gap-2">
                    <PresetButton
                      label="Sharpen"
                      onClick={() => setSettings({ sharpness: 60, contrast: 10, brightness: 0, saturation: 0 })}
                    />
                    <PresetButton
                      label="Vivid"
                      onClick={() => setSettings({ sharpness: 30, contrast: 20, brightness: 5, saturation: 30 })}
                    />
                    <PresetButton
                      label="Soft"
                      onClick={() => setSettings({ sharpness: 0, contrast: -10, brightness: 10, saturation: -20 })}
                    />
                    <PresetButton
                      label="Dramatic"
                      onClick={() => setSettings({ sharpness: 50, contrast: 40, brightness: -5, saturation: 10 })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-100 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs text-neutral-400">
            Requested by @Ayush_kumar_jha_14 · Built by @clonkbot
          </p>
        </div>
      </footer>
    </div>
  );
}

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}

function SliderControl({ label, value, onChange, min, max }: SliderControlProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm text-neutral-700">{label}</span>
        <span className="text-xs text-neutral-400 tabular-nums">{value}</span>
      </div>
      <div className="relative h-1 bg-neutral-100 rounded-full">
        <div
          className="absolute h-full bg-neutral-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-neutral-300 rounded-full shadow-sm pointer-events-none"
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      </div>
    </div>
  );
}

interface PresetButtonProps {
  label: string;
  onClick: () => void;
}

function PresetButton({ label, onClick }: PresetButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2.5 text-sm text-neutral-600 border border-neutral-200 rounded-sm hover:bg-neutral-50 hover:border-neutral-300 transition-colors text-center"
    >
      {label}
    </button>
  );
}

export default App;

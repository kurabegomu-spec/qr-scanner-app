import { useState, useEffect, useRef } from "react";
import { Trash2, Camera, Scan, Clipboard } from "lucide-react";
import jsQR from "jsqr";

const App: React.FC = () => {
  const [scannedData, setScannedData] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null); // Để quản lý interval

  useEffect(() => {
    const savedData = localStorage.getItem('qrScanHistory');
    if (savedData) {
      setScannedData(JSON.parse(savedData));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('qrScanHistory', JSON.stringify(scannedData));
  }, [scannedData]);

  // Cleanup interval khi unmount hoặc stop
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUser Media) {
        throw new Error("Thiết bị không hỗ trợ camera");
      }

      const stream = await navigator.mediaDevices.getUser Media({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        scanQRCode();
      }
    } catch (err) {
      console.error("Lỗi camera:", err);
      setError("Không thể truy cập camera. Kiểm tra quyền và thử lại.");
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
    setScanResult(null);
    setError(null);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    scanIntervalRef.current = setInterval(() => {
      if (!isScanning || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code) {
        const newData = code.data || "Dữ liệu QR không đọc được";
        setScanResult(newData);
        setScannedData(prev => [newData, ...prev]);
        stopScanning();
        return;
      }
    }, 300); // Quét mỗi 300ms
  };

  const clearHistory = () => {
    if (window.confirm("Xóa toàn bộ lịch sử?")) {
      setScannedData([]);
      localStorage.removeItem('qrScanHistory');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Đã sao chép!");
    }).catch(() => {
      alert("Không thể sao chép, thử thủ công.");
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="md:hidden bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-sm flex items-center">
            📱 Hoạt động tốt nhất trên Chrome/Safari. Cho phép camera khi được hỏi.
          </p>
        </div>

        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Code Scanner</h1>
          <p className="text-gray-600">Quét và lưu trữ dữ liệu từ mã QR</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Quét mã QR
              </h2>
              <p className="card-description">Đưa mã QR vào khung hình</p>
            </div>
            <div className="card-content space-y-4 p-4">
              <div className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
                {isScanning ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-2 border-dashed border-blue-500 rounded-lg w-3/4 h-3/4 flex items-center justify-center bg-black/20">
                        <p className="text-blue-100 text-sm font-medium">Đưa QR vào đây</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-500">
                      <Scan className="w-12 h-12 mx-auto mb-2" />
                      <p>Nhấn nút để bắt đầu quét</p>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {scanResult && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 font-medium mb-1">Quét thành công!</p>
                  <p className="text-green-700 text-sm mb-2 break-words">{scanResult}</p>
                  <button
                    onClick={() => copyToClipboard(scanResult)}
                    className="flex items-center gap-1 text-sm text-green-700 hover:underline"
                  >
                    <Clipboard className="w-4 h-4" />
                    Sao chép
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                {!isScanning ? (
                  <button onClick={startScanning} className="btn-primary flex-1 py-3 text-base">
                    <Camera className="w-5 h-5 mr-2" />
                    Bắt đầu quét
                  </button>
                ) : (
                  <button onClick={stopScanning} className="btn-secondary flex-1 py-3 text-base">
                    Dừng quét
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="card-title">Lịch sử quét</h2>
              {scannedData.length > 0 && (
                <button onClick={clearHistory} className="text-red-500 hover:text-red-700 p-1 rounded">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="card-description p-4 pb-2">
              {scannedData.length} mã QR đã quét
            </div>
            <div className="card-content p-4">
              {scannedData.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Chưa có dữ liệu</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {scannedData.map((data, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium break-words text-gray-900">{data}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date().toLocaleString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:hidden">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Mẹo trên mobile</h2>
            </div>
            <div className="card-content p-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Giữ ổn định, đủ sáng</li>
                <li>Khoảng cách 20-30cm</li>
                <li>Tự động lưu sau quét</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card mb-8">
          <div className="card-header">
            <h2 className="card-title">Hướng dẫn</h2>
          </div>
          <div className="card-content p-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Nhấn "Bắt đầu quét" và cho phép camera</li>
              <li>Đưa QR vào khung (trên mobile có hướng dẫn đỏ)</li>
              <li>Tự động nhận diện và lưu</li>
              <li>Xem lịch sử bên phải, xóa nếu cần</li>
              <li><span className="text-blue-600 font-medium">Test với QR từ qr-code-generator.com</span></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

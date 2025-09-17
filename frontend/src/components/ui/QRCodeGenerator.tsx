import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Download, Copy, Share2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

import Button from './Button';
import { Card, CardContent } from './Card';
import { getSharingUrl } from '../../utils/urlHelper';

export interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
  showDownload?: boolean;
  showCopy?: boolean;
  showShare?: boolean;
  filename?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  size = 200,
  title = 'QR Code',
  subtitle,
  backgroundColor = '#FFFFFF',
  foregroundColor = '#000000',
  level = 'M',
  className,
  showDownload = true,
  showCopy = true,
  showShare = true,
  filename = 'qr-code'
}) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  /**
   * Download QR code as PNG
   */
  const handleDownload = async () => {
    try {
      if (!qrRef.current) return;

      const svg = qrRef.current.querySelector('svg');
      if (!svg) return;

      // Create canvas and draw SVG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        canvas.width = size;
        canvas.height = size;

        // Fill background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, size, size);

        // Draw SVG
        ctx.drawImage(img, 0, 0, size, size);

        // Download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('QR code downloaded successfully!');
          }
        }, 'image/png');

        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  /**
   * Copy QR code data to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('QR code data copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy QR code data');
    }
  };

  /**
   * Share QR code using Web Share API
   */
  const handleShare = async () => {
    if (!navigator.share) {
      // Fallback to copying
      handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: title,
        text: subtitle || 'QR Code',
        url: getSharingUrl()
      });
      toast.success('QR code shared successfully!');
    } catch (error) {
      // User cancelled sharing
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        handleCopy(); // Fallback to copy
      }
    }
  };

  return (
    <Card className={clsx('text-center', className)}>
      <CardContent className="p-6">
        {/* Title and Subtitle */}
        {(title || subtitle) && (
          <div className="mb-6">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* QR Code */}
        <div
          ref={qrRef}
          className="flex justify-center mb-6 p-4 bg-white rounded-lg border"
          style={{ backgroundColor }}
        >
          <QRCode
            value={value}
            size={size}
            bgColor={backgroundColor}
            fgColor={foregroundColor}
            level={level}
            includeMargin={true}
          />
        </div>

        {/* Actions */}
        {(showDownload || showCopy || showShare) && (
          <div className="flex flex-wrap gap-2 justify-center">
            {showDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download
              </Button>
            )}
            {showCopy && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                className={clsx(copied && 'text-green-600 border-green-600')}
              >
                {copied ? 'Copied!' : 'Copy Data'}
              </Button>
            )}
            {showShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Share
              </Button>
            )}
          </div>
        )}

        {/* Technical Info */}
        <div className="mt-4 text-xs text-gray-500">
          <p>Size: {size}×{size}px • Level: {level}</p>
          <p className="truncate mt-1">Data: {value.length > 50 ? `${value.substring(0, 50)}...` : value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;
'use client';

import React, { useState, useRef } from 'react';
import type { Platform } from './PlatformCards';

interface ComposePanelProps {
  initialCaption?: string;
  onPost: () => void;
}

const PLATFORM_LIMITS = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  tiktok: 2200,
  youtube: 5000,
};

const PLATFORM_ICONS = {
  instagram: '📷',
  facebook: 'f',
  linkedin: 'in',
  tiktok: '♪',
  youtube: '▶',
};

const ComposePanel: React.FC<ComposePanelProps> = ({ initialCaption = '', onPost }) => {
  const [caption, setCaption] = useState(initialCaption);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragZoneRef = useRef<HTMLDivElement>(null);

  const platforms: Platform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'];

  const getCharacterLimit = () => {
    if (selectedPlatforms.length === 0) return 5000;
    const limits = selectedPlatforms.map(p => PLATFORM_LIMITS[p]);
    return Math.min(...limits);
  };

  const getCharacterWarning = () => {
    const limit = getCharacterLimit();
    if (caption.length > limit) {
      return `${caption.length - limit} characters over limit`;
    }
    return null;
  };

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleMediaSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onload = e => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dragZoneRef.current?.classList.add('bg-[#378ADD]', 'bg-opacity-10');
  };

  const handleDragLeave = () => {
    dragZoneRef.current?.classList.remove('bg-[#378ADD]', 'bg-opacity-10');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragZoneRef.current?.classList.remove('bg-[#378ADD]', 'bg-opacity-10');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleMediaSelect(files[0]);
    }
  };

  const handleSubmit = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    if (caption.trim().length === 0) {
      alert('Please enter a caption');
      return;
    }

    const warning = getCharacterWarning();
    if (warning) {
      alert(`Caption exceeds platform limit: ${warning}`);
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        caption,
        mediaUrl: mediaPreview || undefined,
        mediaType: mediaFile?.type || undefined,
        platforms: selectedPlatforms,
        scheduledAt: isScheduling && scheduledDate ? `${scheduledDate}T${scheduledTime}` : undefined,
      };

      const response = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to post');
      }

      setCaption('');
      setMediaFile(null);
      setMediaPreview(null);
      setSelectedPlatforms([]);
      setIsScheduling(false);
      setScheduledDate('');
      setScheduledTime('09:00');

      onPost();
    } catch (error) {
      console.error('Post error:', error);
      alert('Failed to post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const charLimit = getCharacterLimit();
  const charWarning = getCharacterWarning();

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-6">
      {/* Caption Input */}
      <div>
        <label className="block text-white font-medium mb-2">Caption</label>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Write your post caption here..."
          className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-3 text-white placeholder-[#8B949E] resize-none focus:outline-none focus:border-[#378ADD] h-32"
        />
        <div className="flex justify-between items-center mt-2">
          <span className={`text-sm ${charWarning ? 'text-red-400' : 'text-[#8B949E]'}`}>
            {caption.length} / {charLimit} characters
            {charWarning && ` - ${charWarning}`}
          </span>
          {selectedPlatforms.length > 0 && (
            <span className="text-xs text-[#8B949E]">
              Limited by {selectedPlatforms.sort((a, b) => PLATFORM_LIMITS[a] - PLATFORM_LIMITS[b])[0]}
            </span>
          )}
        </div>
      </div>

      {/* Platform Selector */}
      <div>
        <label className="block text-white font-medium mb-3">Post to platforms</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => handlePlatformToggle(platform)}
              className={`py-2 px-3 rounded-lg font-medium text-sm transition-colors capitalize ${
                selectedPlatforms.includes(platform)
                  ? 'bg-[#378ADD] text-white'
                  : 'bg-[#0D1117] text-[#8B949E] border border-[#30363D] hover:border-[#378ADD]'
              }`}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      {/* Media Upload */}
      <div>
        <label className="block text-white font-medium mb-3">Media (optional)</label>
        <div
          ref={dragZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="border-2 border-dashed border-[#30363D] rounded-lg p-6 text-center cursor-pointer hover:border-[#378ADD] transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={e => e.target.files?.[0] && handleMediaSelect(e.target.files[0])}
            className="hidden"
          />

          {mediaPreview ? (
            <div className="space-y-3">
              <img src={mediaPreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg mx-auto" />
              <div>
                <p className="text-white font-medium">{mediaFile?.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-red-400 text-sm hover:text-red-300 mt-2"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="space-y-2"
            >
              <div className="text-3xl">📸</div>
              <p className="text-white font-medium">Drag and drop an image here</p>
              <p className="text-[#8B949E] text-sm">or click to browse</p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="schedule-toggle"
          checked={isScheduling}
          onChange={e => setIsScheduling(e.target.checked)}
          className="w-4 h-4 accent-[#378ADD]"
        />
        <label htmlFor="schedule-toggle" className="text-white font-medium cursor-pointer">
          Schedule for later
        </label>
      </div>

      {/* Schedule Date/Time Pickers */}
      {isScheduling && (
        <div className="grid grid-cols-2 gap-4 bg-[#0D1117] p-4 rounded-lg border border-[#30363D]">
          <div>
            <label className="block text-[#8B949E] text-sm mb-2">Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2 text-white focus:outline-none focus:border-[#378ADD]"
            />
          </div>
          <div>
            <label className="block text-[#8B949E] text-sm mb-2">Time</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2 text-white focus:outline-none focus:border-[#378ADD]"
            />
          </div>
        </div>
      )}

      {/* Post Preview */}
      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
        <p className="text-[#8B949E] text-sm mb-3 font-medium">Preview</p>
        <div className="space-y-3">
          <p className="text-white text-sm line-clamp-3">{caption || 'Your caption will appear here'}</p>
          {selectedPlatforms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedPlatforms.map(platform => (
                <span key={platform} className="bg-[#378ADD] text-white text-xs px-2 py-1 rounded-full capitalize">
                  {platform}
                </span>
              ))}
            </div>
          )}
          <div className="text-xs text-[#8B949E]">
            {caption.length} / {charLimit}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={isLoading || selectedPlatforms.length === 0 || caption.trim().length === 0}
          className="flex-1 bg-[#378ADD] text-white font-medium py-3 rounded-lg hover:bg-[#2E6BA3] disabled:bg-[#30363D] disabled:text-[#8B949E] transition-colors"
        >
          {isLoading ? 'Processing...' : isScheduling && scheduledDate ? 'Schedule Post' : 'Post Now'}
        </button>
        <button
          onClick={() => {
            setCaption('');
            setMediaFile(null);
            setMediaPreview(null);
            setSelectedPlatforms([]);
            setIsScheduling(false);
            setScheduledDate('');
            setScheduledTime('09:00');
          }}
          className="px-6 bg-[#0D1117] text-[#8B949E] font-medium border border-[#30363D] py-3 rounded-lg hover:border-[#378ADD] transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default ComposePanel;

'use client';

interface IntercomWindowsProps {
  selectedDate: Date;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'John Doe',
    content: 'When can we schedule the refinance review?',
    timestamp: new Date(Date.now() - 30 * 60000),
  },
  {
    id: '2',
    sender: 'Sarah Johnson',
    content: 'The documents are ready for the closing.',
    timestamp: new Date(Date.now() - 60 * 60000),
  },
  {
    id: '3',
    sender: 'Mike Smith',
    content: 'Question about the rate adjustment on our application',
    timestamp: new Date(Date.now() - 120 * 60000),
  },
];

export default function IntercomWindows({ selectedDate }: IntercomWindowsProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-4">Messages</h3>
      <div className="space-y-2">
        {mockMessages.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-gray-400 text-sm">No messages</p>
          </div>
        ) : (
          mockMessages.map((message) => (
            <div
              key={message.id}
              className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white">{message.sender}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1">{message.content}</p>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

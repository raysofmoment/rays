export const getFormattedOrderName = (order: { eventType: string; packageName: string }) => {
  const eventTypeMap: Record<string, string> = {
    'WEDD BRIDESIDE': 'Wedding Bride Side',
    'WEDD GROOM': 'Wedding Groom Side',
    'WEDD BOTH': 'Wedding Both Side',
    'ANNOPRASAN': 'Annoprasan',
    'BIRTHDAY': 'Birthday',
    'UPANAYAN': 'Upanayan',
    'MODEL SHOOT': 'Model Shoot',
    'CINEMATIC': 'Cinematic',
    'EVENT': 'Event',
    'SHORT FILM': 'Short Film',
    'MUSIC VIDEO': 'Music Video',
    'OUTDOOR': 'Outdoor Shoot'
  };

  const typeName = eventTypeMap[order.eventType] || order.eventType || '';
  
  // Clean up package name - remove (Crop Sensor), (Full Sensor), (x1) etc.
  let cleanPackageName = (order.packageName || '').split(' (')[0].split(' (x')[0];
  
  if (typeName && cleanPackageName) {
    return `${typeName} ${cleanPackageName}`.toLowerCase();
  }
  return (cleanPackageName || typeName || 'Unnamed Order').toLowerCase();
};

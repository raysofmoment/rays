const test = async () => {
    try {
        const FOLDER_MAP: Record<string, string> = {
            'Wedding': '1sWUCrEJQHgZfzF0C3ZbqL5xbYGxYo4Qn',
            'Music': '1UIs_4grBIKa2aq7qGLxWIlTmBm8gsXBg',
            'Kids': '1tX7LLW8IuorWPEh4_GZWir79T4SkPMM3',
            'Event': '1RUcpnCc3NIV87PI4OEhsiTQHd13FBAa0',
            'Other': '1WkAnOgDEioFqAyvD5BzTGi2ybB6ohc0V'
        };
        const fetchPromises = Object.entries(FOLDER_MAP).map(async ([category, folderId]) => {
          try {
            console.log(`Fetching ${category}...`);
            const response = await fetch(`http://localhost:3000/api/drive/list/${folderId}`);
            console.log(`Response for ${category}: ${response.status}`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.map((file: any) => ({ ...file, driveCategory: category }));
          } catch (err) {
            console.error(`Error fetching folder ${category}:`, err);
            return [];
          }
        });
        
        await Promise.all(fetchPromises);
        console.log("All done.");
    } catch (e) {
        console.error('Fetch error:', e);
    }
};
test();

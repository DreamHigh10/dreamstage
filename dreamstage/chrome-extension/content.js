console.log("DreamStage Chat Pinner Loaded");

document.addEventListener('click', (e) => {
    // Find the closest YouTube chat message element
    const chatItem = e.target.closest('yt-live-chat-text-message-renderer');

    if (chatItem) {
        // Prevent default navigation/selection if needed
        e.preventDefault();

        // Extract data
        const author = chatItem.querySelector('#author-name')?.textContent?.trim() || 'Unknown';
        const text = chatItem.querySelector('#message')?.textContent?.trim() || '';
        const img = chatItem.querySelector('#img')?.src;

        const id = chatItem.id || Math.random().toString();

        console.log("Pinning to DreamStage:", { author, text });

        // Flash effect on the chat item to confirm interaction
        const originalBg = chatItem.style.backgroundColor;
        chatItem.style.backgroundColor = 'rgba(249, 115, 22, 0.3)'; // Orange flash
        setTimeout(() => {
            chatItem.style.backgroundColor = originalBg;
        }, 300);

        // POST to the local Next.js SyncBus API
        fetch('http://localhost:3000/api/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'PIN_CARD',
                payload: {
                    id,
                    author,
                    text,
                    avatarUrl: img
                }
            })
        }).catch(err => {
            console.error("Failed to pin to DreamStage. Is localhost:3000 running?", err);
        });
    }
});

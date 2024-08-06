const { YouTubeSR, Playlist, Track } = require("discord-player");

async function handlePlaylist(query, context, extractor) {
    try {
        const playlistData = await YouTubeSR.YouTube.getPlaylist(query, {
            fetchAll: true,
            limit: context.requestOptions?.limit,
            requestOptions: context.requestOptions,
        });

        if (!playlistData) return extractor.emptyResponse();

        const playlist = new Playlist(extractor.context.player, {
            title: playlistData.title,
            thumbnail: playlistData.thumbnail?.displayThumbnailURL("maxresdefault"),
            description: playlistData.title || "",
            type: "playlist",
            source: "youtube",
            author: {
                name: playlistData.channel.name,
                url: playlistData.channel.url,
            },
            tracks: [],
            id: playlistData.id,
            url: playlistData.url,
            rawPlaylist: playlistData,
        });

        playlist.tracks = playlistData.videos.map((video) => {
            const track = new Track(extractor.context.player, {
                title: video.title,
                description: video.description,
                author: video.channel?.name,
                url: video.url,
                requestedBy: context.requestedBy,
                thumbnail: video.thumbnail.url,
                views: video.views,
                duration: video.durationFormatted,
                raw: video,
                playlist,
                source: "youtube",
                queryType: "youtubeVideo",
                metadata: video,
                async requestMetadata() {
                    return video;
                },
            });
            track.extractor = extractor;
            return track;
        });

        return { playlist, tracks: playlist.tracks };
    } catch (error) {
        console.error(`Error in handlePlaylist: ${error.message}`);
        return extractor.emptyResponse();
    }
}

async function handleVideo(query, context, extractor) {
    try {
        const videoIdMatch = /[a-zA-Z0-9-_]{11}/.exec(query);
        if (!videoIdMatch) return extractor.emptyResponse();

        const video = await YouTubeSR.YouTube.getVideo(`https://www.youtube.com/watch?v=${videoIdMatch[0]}`, context.requestOptions);
        if (!video) return extractor.emptyResponse();

        const track = new Track(extractor.context.player, {
            title: video.title,
            description: video.description,
            author: video.channel?.name,
            url: video.url,
            requestedBy: context.requestedBy,
            thumbnail: video.thumbnail?.displayThumbnailURL("maxresdefault"),
            views: video.views,
            duration: video.durationFormatted,
            source: "youtube",
            raw: video,
            queryType: context.type,
            metadata: video,
            async requestMetadata() {
                return video;
            },
        });

        track.extractor = extractor;
        return { playlist: null, tracks: [track] };
    } catch (error) {
        console.error(`Error in handleVideo: ${error.message}`);
        return extractor.emptyResponse();
    }
}

async function searchYouTube(query, context) {
    try {
        const results = await YouTubeSR.YouTube.search(query, {
            type: "video",
            safeSearch: context.requestOptions?.safeSearch,
            requestOptions: context.requestOptions,
        });

        return results.map((video) => new Track(context.player, {
            title: video.title,
            description: video.description,
            author: video.channel?.name,
            url: video.url,
            requestedBy: context.requestedBy,
            thumbnail: video.thumbnail?.displayThumbnailURL("maxresdefault"),
            views: video.views,
            duration: video.durationFormatted,
            source: "youtube",
            raw: video,
            queryType: context.type,
            metadata: video,
            async requestMetadata() {
                return video;
            },
        })) || [];
    } catch (error) {
        console.error(`Error in searchYouTube: ${error.message}`);
        return [];
    }
}

module.exports = { handlePlaylist, handleVideo, searchYouTube };

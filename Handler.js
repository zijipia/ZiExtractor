const { Playlist, Track, Util } = require("discord-player");
const YouTubeSR = require("youtube-sr");
async function searchYouTube(query, options = {}) {
    try {
        return await YouTubeSR.YouTube.search(query, {
            type: "video",
            safeSearch: options.safeSearch,
            requestOptions: options,
        }) || [];
    } catch (error) {
        console.error(`Error in searchYouTube: ${error.message}`);
        return [];
    }
}
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
            queryType: "youtubeVideo",
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

async function searchYouTube(query, context, extractor) {

    try {
        const results = await YouTubeSR.YouTube.search(query, {
            type: "video",
            safeSearch: context.requestOptions?.safeSearch,
            requestOptions: context.requestOptions,
        });

        return results.map((video) => new Track(extractor.context.player, {
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
            queryType: "youtubeVideo",
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

async function RelatedTracks(track, history, extractor) {
    let info = void 0;
    info = await YouTubeSR.YouTube.search(track?.author || track.title, { limit: 15, type: "video" }).then((x) => x).catch(Util.noop);
    if (!info?.length) {
        return [];
    }
    const unique = info.filter((t) => !history.tracks.some((x) => x.url === t.url));
    const similar = (unique.length > 0 ? unique : info).map((video) => {
        const t = new Track(extractor.context.player, {
            title: video.title,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            duration: video.durationFormatted || Util.buildTimeCode(Util.parseMS(video.duration * 1e3)),
            description: video.title,
            thumbnail: typeof video.thumbnail === "string" ? video.thumbnail : video.thumbnail.url,
            views: video.views,
            author: video.channel.name,
            requestedBy: track.requestedBy,
            source: "youtube",
            queryType: "youtubeVideo",
            metadata: video,
            async requestMetadata() {
                return video;
            }
        });
        t.extractor = extractor;
        return t;
    });
    return similar;
}
module.exports = { handlePlaylist, handleVideo, searchYouTube, RelatedTracks };

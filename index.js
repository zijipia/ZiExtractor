const { BaseExtractor, QueryType, Track, Playlist, Util } = require("discord-player");
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

async function getStream(query, _) {
    try {
        const resp = await fetch("https://api.cobalt.tools/api/json", {
            "headers": {
                "accept": "application/json",
                "content-type": "application/json",
            },
            "body": JSON.stringify({ url: query.url, isAudioOnly: true }),
            "method": "POST",
        });
        const data = await resp.json();
        return data.url;
    } catch (error) {
        console.error(`Error in getStream: ${error.message}`);
        return null;
    }
}


class ZiExtractor extends BaseExtractor {
    static identifier = "com.Ziji.discord-player.youtube-Zijiext";
    static instance;

    async activate() {
        this.protocols = ["ytsearch", "youtube"];
        this._stream = this.options.createStream || ((query) => getStream(query, null));
        ZiExtractor.instance = this;
    }

    async deactivate() {
        this.protocols = [];
        ZiExtractor.instance = null;
    }

    async validate(query, type) {
        return typeof query === "string" && [
            QueryType.AUTO,
            QueryType.AUTO_SEARCH,
        ].includes(type);
    }

    async handle(query, context) {
        query = query.includes("youtube.com") ? query.replace(/(m(usic)?|gaming)\./, "") : query;

        if (!query.includes("list=RD") && isValidYouTubeURL(query)) context.type = QueryType.YOUTUBE_VIDEO;

        if (context.type === QueryType.YOUTUBE_PLAYLIST) return this.handlePlaylist(query, context);
        if (context.type === QueryType.YOUTUBE_VIDEO) return this.handleVideo(query, context);

        const tracks = await this._searchYouTube(query, context);
        return { playlist: null, tracks };
    }

    async handlePlaylist(query, context) {
        try {
            const playlistData = await YouTubeSR.YouTube.getPlaylist(query, {
                fetchAll: true,
                limit: context.requestOptions?.limit,
                requestOptions: context.requestOptions,
            });

            if (!playlistData) return this.emptyResponse();

            const playlist = new Playlist(this.context.player, {
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
                const track = new Track(this.context.player, {
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
                track.extractor = this;
                return track;
            });

            return { playlist, tracks: playlist.tracks };
        } catch (error) {
            console.error(`Error in handlePlaylist: ${error.message}`);
            return this.emptyResponse();
        }
    }

    async handleVideo(query, context) {
        try {
            const videoIdMatch = /[a-zA-Z0-9-_]{11}/.exec(query);
            if (!videoIdMatch) return this.emptyResponse();

            const video = await YouTubeSR.YouTube.getVideo(`https://www.youtube.com/watch?v=${videoIdMatch[0]}`, context.requestOptions);
            if (!video) return this.emptyResponse();

            const track = new Track(this.context.player, {
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

            track.extractor = this;
            return { playlist: null, tracks: [track] };
        } catch (error) {
            console.error(`Error in handleVideo: ${error.message}`);
            return this.emptyResponse();
        }
    }

    async _searchYouTube(query, context) {
        try {
            const results = await searchYouTube(query, context.requestOptions);
            return results.map((video) => new Track(this.context.player, {
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
            console.error(`Error in _searchYouTube: ${error.message}`);
            return [];
        }
    }

    stream(info) {
        return this._stream(info, this);
    }

}

module.exports = { ZiExtractor };
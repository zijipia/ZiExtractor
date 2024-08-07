const { BaseExtractor, QueryType, Track, Util } = require("discord-player");
const { YouTubeExtractor } = require("@discord-player/extractor")
const { getLinkPreview } = require("link-preview-js");
const { searchYouTube, handlePlaylist, handleVideo, RelatedTracks } = require("./Handler");

async function getStream(query, _) {
    try {
        const resp = await fetch("https://api.cobalt.tools/api/json", {
            headers: {
                accept: "application/json",
                "content-type": "application/json",
            },
            body: JSON.stringify({ url: query.url, isAudioOnly: true }),
            method: "POST",
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
        this.protocols = [
            "https",
            "bilibili",
            "dailymotion",
            "facebook",
            "instagram",
            "pinterest",
            "soundcloud",
            "streamable",
            "tiktok",
            "tumblr",
            "twitch",
            "twitter",
            "vimeo",
            "youtube",
        ];
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
            QueryType.YOUTUBE,
            QueryType.YOUTUBE_SEARCH,
            QueryType.YOUTUBE_PLAYLIST,
            QueryType.YOUTUBE_VIDEO,
            QueryType.ARBITRARY,
        ].includes(type);
    }

    async handle(query, context) {
        query = query.includes("youtube.com") ? query.replace(/(m(usic)?|gaming)\./, "") : query;
        if (context.protocol === "https") query = `https:${query}`
        if (!query.includes("list=RD") && YouTubeExtractor.validateURL(query))
            context.type = QueryType.YOUTUBE_VIDEO;
        if (query.includes("list=") && YouTubeExtractor.validateURL(query))
            context.type = QueryType.YOUTUBE_PLAYLIST;

        if (context.type === QueryType.YOUTUBE_PLAYLIST) return handlePlaylist(query, context, this);
        if ([QueryType.YOUTUBE_VIDEO, QueryType.YOUTUBE].includes(context.type)) return handleVideo(query, context, this);
        if (query.includes("youtube.com")) {
            const tracks = await searchYouTube(query, context, this);
            return { playlist: null, tracks };
        }
        if ([QueryType.ARBITRARY].includes(context.type)) {
            try {
                const data = await getLinkPreview(query, {
                    timeout: 1000,
                });
                const track = new Track(this.context.player, {
                    title: data?.title ?? query,
                    author: data.title,
                    description: query,
                    url: data.url,
                    requestedBy: context.requestedBy,
                    thumbnail: data.images?.at(0) ?? data.favicons?.at(0) ?? "https://raw.githubusercontent.com/zijipia/zijipia/main/Assets/image.png",
                    source: "ARBITRARY",
                    raw: data,
                    queryType: context.type,
                    metadata: data,
                    async requestMetadata() {
                        return data;
                    },
                });

                track.extractor = this;
                return { playlist: null, tracks: [track] };
            } catch (error) {
                console.error(`Error in handleVideo: ${error.message}`);
                return this.emptyResponse();
            }
        }

        return this.emptyResponse();

    }

    async getRelatedTracks(track, history) {
        const tracks = await RelatedTracks(track, history, this);
        if (!tracks.length) return this.createResponse();
        return this.createResponse(null, tracks);

    }

    stream(info) {
        return this._stream(info, this);
    }

    emptyResponse() {
        return { playlist: null, tracks: [] };
    }
}

module.exports = { ZiExtractor };

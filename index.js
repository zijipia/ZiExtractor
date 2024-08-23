const { BaseExtractor, QueryType, Track } = require("discord-player");
const { getLinkPreview } = require("link-preview-js");
const { searchYouTube, handlePlaylist, handleVideo, RelatedTracks } = require("./Handler");
const { YouTubeExtractor } = require("@discord-player/extractor");

async function getStream(query) {
    try {
        const response = await fetch("https://api.cobalt.tools/api/json", {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
            },
            body: JSON.stringify({ url: query.url, isAudioOnly: true }),
        });

        const data = await response.json();
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
        this._stream = this.options.createStream || getStream;
        ZiExtractor.instance = this;
    }

    async deactivate() {
        this.context.player.debug("[ZiExtractor] Deactivating ZiExtractor");
        this.protocols = [];
        ZiExtractor.instance = null;
    }

    validate(query, type) {
        this.context.player.debug(`[ZiExtractor] Validating query: ${query} with type: ${type}`);
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
        this.context.player.debug(`[ZiExtractor] Handling query: ${query}`);
        try {
            // Prepend 'https:' for relative protocol URLs
            if (context.protocol === "https") query = `https:${query}`;
            // YouTube specific handling
            if (["youtube", "youtu.be"].includes(query) || YouTubeExtractor.validateURL(query)) {
                query = query.replace(/(m(usic)?|gaming)\./, "");

                if (context.type === QueryType.YOUTUBE_PLAYLIST || query.includes("list=")) {
                    this.context.player.debug(`[ZiExtractor] Handling YouTube playlist: ${query}`);
                    return handlePlaylist(query, context, this);
                }

                if ([QueryType.YOUTUBE_VIDEO, QueryType.YOUTUBE].includes(context.type) || YouTubeExtractor.validateURL(query)) {
                    this.context.player.debug(`[ZiExtractor] Handling YouTube video: ${query}`);
                    return handleVideo(query, context, this);
                }

                this.context.player.debug(`[ZiExtractor] Searching YouTube for query: ${query}`);
                const tracks = await searchYouTube(query, context, this);
                return { playlist: null, tracks };
            }
            // Non-YouTube handling
            this.context.player.debug(`[ZiExtractor] Handling non-YouTube query: ${query}`);
            const data = await getLinkPreview(query, { timeout: 1500 });
            const track = this.createTrack(data, query, context);

            return { playlist: null, tracks: [track] };
        } catch (error) {
            this.context.player.debug(`[ZiExtractor] Error in handle: ${error.message}`);
            console.error(`Error in handle: ${error.message}`);
            return this.emptyResponse();
        }
    }

    createTrack(data, query, context) {
        this.context.player.debug(`[ZiExtractor] Creating track for query: ${query}`);
        return new Track(this.context.player, {
            title: data?.title || query,
            author: data?.title || "Unknown",
            description: query,
            url: data.url,
            requestedBy: context.requestedBy,
            thumbnail: data.images?.[0] || data.favicons?.[0] || "https://raw.githubusercontent.com/zijipia/zijipia/main/Assets/image.png",
            source: "ZiExt",
            raw: data,
            queryType: context.type,
            metadata: data,
            async requestMetadata() {
                return data;
            },
        });
    }

    async getRelatedTracks(track, history) {
        this.context.player.debug(`[ZiExtractor] Fetching related tracks for: ${track.url}`);
        const tracks = await RelatedTracks(track, history, this);
        return tracks.length ? this.createResponse(null, tracks) : this.emptyResponse();
    }

    stream(info) {
        this.context.player.debug(`[ZiExtractor] Streaming info for: ${info.url}`);
        return this._stream(info);
    }

    emptyResponse() {
        this.context.player.debug("[ZiExtractor] Returning empty response");
        return { playlist: null, tracks: [] };
    }
}

module.exports = { ZiExtractor };

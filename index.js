const youtubei = require("youtubei.js");
const { BaseExtractor, QueryType, Track, Playlist, Util } = require("discord-player");
const YouTubeSR = require("youtube-sr");
const { Readable } = require("stream");

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

async function getYouTubeStream(query, innerTube) {
    try {
        const videoId = new URL(query.url).searchParams.get("v") || query.url.split("/").pop().split("?")[0];
        const videoInfo = await innerTube.getBasicInfo(videoId, "WEB");

        if (videoInfo.basic_info.is_live && videoInfo.basic_info.is_family_safe) {
            return videoInfo.streaming_data?.hls_manifest_url;
        }

        const downloadStream = await videoInfo.download({ quality: "best", format: "mp4", type: "audio" });
        return Readable.fromWeb(downloadStream);
    } catch (error) {
        console.error(`Error in getYouTubeStream: ${error.message}`);
        return null;
    }
}

function isValidYouTubeURL(link) {
    const videoIdPattern = /^[a-zA-Z0-9-_]{11}$/;
    const validYouTubeDomains = /^(?:https?:\/\/)?(?:www\.)?(youtube\.com|youtu\.be)/;

    function validateVideoId(id) {
        return videoIdPattern.test(id.trim());
    }

    function extractVideoId(link) {
        const parsedURL = new URL(link.trim());
        let videoId = parsedURL.searchParams.get("v") || (parsedURL.host === "youtu.be" ? parsedURL.pathname.split("/")[1] : parsedURL.pathname.split("/")[2]);

        if (!validYouTubeDomains.test(link.trim()) || !videoId) throw Error(`Invalid YouTube URL: "${link}"`);
        if (!validateVideoId(videoId)) throw TypeError(`Invalid video id: ${videoId}`);

        return videoId;
    }

    try {
        extractVideoId(link);
        return true;
    } catch {
        return false;
    }
}

class ZiExtractor extends BaseExtractor {
    static identifier = "com.Ziji.discord-player.youtube-Zijiext";
    static instance;

    async activate() {
        this.protocols = ["ytsearch", "youtube"];
        this.innerTube = await youtubei.default.create({ retrieve_player: false });
        this._stream = this.options.createStream || ((query) => getYouTubeStream(query, this.innerTube));
        ZiExtractor.instance = this;
    }

    async deactivate() {
        this.protocols = [];
        ZiExtractor.instance = null;
    }

    async validate(query, type) {
        return typeof query === "string" && [
            QueryType.YOUTUBE,
            QueryType.YOUTUBE_PLAYLIST,
            QueryType.YOUTUBE_SEARCH,
            QueryType.YOUTUBE_VIDEO,
            QueryType.AUTO,
            QueryType.AUTO_SEARCH,
        ].includes(type);
    }

    async bridge(track, ext) {
        const query = ext?.createBridgeQuery(track) || `${track.author} - ${track.title} (official audio)`;
        const youtubeTrack = await this.handle(query, { type: QueryType.YOUTUBE_SEARCH, requestedBy: track.requestedBy });

        if (!youtubeTrack.tracks.length) return null;
        return this.stream(youtubeTrack.tracks[0]);
    }

    async handle(query, context) {
        if (context.protocol === "ytsearch") context.type = QueryType.YOUTUBE_SEARCH;
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

    async getRelatedTracks(track, history) {
        try {
            const videoId = new URL(track.url).searchParams.get("v") || track.url.split("/").pop().split("?")[0];
            const videoInfo = await this.innerTube.getInfo(videoId);
            const recommendedVideos = videoInfo.watch_next_feed.filter(
                (video) => !history.tracks.some((x) => x.url === `https://youtube.com/watch?v=${video.id}`) && video.type === "CompactVideo"
            );

            if (!recommendedVideos) {
                this.context.player.debug("Unable to fetch recommendations");
                return this.emptyResponse();
            }

            const relatedTracks = recommendedVideos.map((video) => {
                const duration = Util.buildTimeCode(Util.parseMS(video.duration.seconds * 1000));
                const rawMetadata = { live: video.is_live, duration_ms: video.duration.seconds * 1000, duration };

                return new Track(this.context.player, {
                    title: video.title?.text ?? "UNKNOWN TITLE",
                    thumbnail: video.best_thumbnail?.url ?? video.thumbnails[0]?.url,
                    author: video.author?.name ?? "UNKNOWN AUTHOR",
                    requestedBy: track.requestedBy,
                    url: `https://youtube.com/watch?v=${video.id}`,
                    views: parseInt((video.view_count?.text ?? "0").replace(/,/g, "")),
                    duration,
                    raw: rawMetadata,
                    source: "youtube",
                    queryType: "youtubeVideo",
                    metadata: rawMetadata,
                    async requestMetadata() {
                        return this.raw;
                    },
                });
            });

            return { playlist: null, tracks: relatedTracks };
        } catch (error) {
            console.error(`Error in getRelatedTracks: ${error.message}`);
            return this.emptyResponse();
        }
    }

    emptyResponse() {
        return { playlist: null, tracks: [] };
    }
}

module.exports = { ZiExtractor };
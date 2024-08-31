import { BaseExtractor, SearchQueryType, Track, GuildQueueHistory, ExtractorInfo, ExtractorSearchContext, ExtractorStreamable } from 'discord-player';
import { Readable } from 'stream';

interface YoutubeExtractorInit {
    createStream?: (ext: BaseExtractor<object>, url: string) => Promise<Readable | string>;
}

type StreamFN = (info: Track) => Promise<Readable | string>;

declare class ZiExtractor extends BaseExtractor<YoutubeExtractorInit> {
    static identifier: "com.Ziji.discord-player.youtube-Zijiext";
    static instance: ZiExtractor | null;
    protocols: Set<string>;
    _stream: StreamFN;

    activate(): Promise<void>;
    deactivate(): Promise<void>;
    validate(query: string, type?: SearchQueryType | null | undefined): boolean;
    handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
    createTrack(data: any, query: string, context: ExtractorSearchContext): Track;
    getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo>;
    stream(info: Track): Promise<ExtractorStreamable>;
    emptyResponse(): ExtractorInfo;
}

export { ZiExtractor };
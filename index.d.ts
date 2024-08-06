import { BaseExtractor, SearchQueryType, Track, GuildQueueHistory, ExtractorInfo, ExtractorSearchContext, ExtractorStreamable, ExtractorExecutionContext, YoutubeExtractor } from 'discord-player';
interface YoutubeExtractorInit {
    createStream?: (ext: BaseExtractor<object>, url: string) => Promise<Readable | string>;
}

type StreamFN = (q: string, ext: BaseExtractor, demuxable?: boolean) => Promise<stream.Readable | string | {
    stream: stream.Readable;
    $fmt: string;
}>;

declare class ZiExtractor extends BaseExtractor<YoutubeExtractorInit> {
    static identifier: "com.Ziji.discord-player.youtube-Zijiext";
    static instance: ZiExtractor | null;
    _stream: StreamFN;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    validate(query: string, type?: SearchQueryType | null | undefined): Promise<boolean>;
    handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
    stream(info: Track): Promise<ExtractorStreamable>;
    getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo>;
}


export { ZiExtractor }
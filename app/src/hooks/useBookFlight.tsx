import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { BookFlightOverlay, type Flight } from '../components/BookFlightOverlay';
import { space, size } from '../design/tokens';
import type { Rect } from '../lib/bookMotion';
import type { MediaRecord } from '../types/record';
import { useReduceMotion } from './useReduceMotion';
import { useTopInset } from './useTopInset';

/** 遷移先のヒーロー背表紙の大きさ（ReadingScreen / RereadScreen の SPINE_SIZE） */
export const HERO_SPINE_SIZE = { width: 40, height: 150 };

export type ViewHandle = ComponentRef<typeof View>;
type ViewRef = RefObject<ViewHandle | null>;

type BookFlightApi = {
  /** 棚の背表紙の ref を登録する。戻り値で登録を外す */
  registerSource: (record: MediaRecord, ref: ViewRef) => () => void;
  /** 遷移先のヒーロー背表紙の ref を登録する。戻り値で登録を外す */
  registerHero: (id: string, ref: ViewRef) => () => void;
  /** 遷移先のヒーロー背表紙の矩形（実測値）を登録する */
  registerTarget: (id: string, rect: Rect) => void;
  /** 棚から取り出す動きを始める（from は棚の背表紙の矩形） */
  open: (record: MediaRecord, from: Rect) => void;
  /** ヒーロー背表紙から棚の元の位置へ戻す動き。棚に載っていない・位置が測れないときは何もしない */
  close: (id: string) => void;
};

const noop = () => undefined;
const noopApi: BookFlightApi = {
  registerSource: () => noop,
  registerHero: () => noop,
  registerTarget: noop,
  open: noop,
  close: noop,
};

const ApiContext = createContext<BookFlightApi>(noopApi);
const FlightContext = createContext<Flight | null>(null);

export function useBookFlight(): BookFlightApi {
  return useContext(ApiContext);
}

/** 動いている最中の本（なければ null）。棚・ヒーローの背表紙を隠すのに使う */
export function useBookFlightState(): Flight | null {
  return useContext(FlightContext);
}

function register<T extends { ref: ViewRef }>(map: Map<string, T>, id: string, entry: T): () => void {
  map.set(id, entry);
  return () => {
    if (map.get(id) === entry) map.delete(id);
  };
}

function measure(ref: ViewRef | undefined, done: (rect: Rect | null) => void): void {
  const view = ref?.current;
  if (!view) return done(null);
  view.measureInWindow((x, y, width, height) => {
    const ok = [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0;
    done(ok ? { x, y, width, height } : null);
  });
}

export function BookFlightProvider({ children }: { children: ReactNode }) {
  const topInset = useTopInset();
  const reduceMotion = useReduceMotion();
  const [flight, setFlight] = useState<Flight | null>(null);
  const sources = useRef(new Map<string, { record: MediaRecord; ref: ViewRef }>());
  const heroes = useRef(new Map<string, { ref: ViewRef }>());
  const targets = useRef(new Map<string, Rect>());
  const counter = useRef(0);
  const reduceRef = useRef(reduceMotion);
  useEffect(() => {
    reduceRef.current = reduceMotion;
  }, [reduceMotion]);

  const start = useCallback((record: MediaRecord, from: Rect, to: Rect, direction: Flight['direction']) => {
    counter.current += 1;
    setFlight({ key: counter.current, record, from, to, direction, reduceMotion: reduceRef.current });
  }, []);

  const api = useMemo<BookFlightApi>(() => {
    // 画面の上端 = セーフエリア + 上部バー（余白 + ボタン + 余白）+ ヒーローの上余白
    const defaultTarget: Rect = {
      x: space[5],
      y: topInset + space[2] + size.touchMin + space[2] + space[4],
      ...HERO_SPINE_SIZE,
    };
    return {
      registerSource: (record, ref) => register(sources.current, record.id, { record, ref }),
      registerHero: (id, ref) => register(heroes.current, id, { ref }),
      registerTarget: (id, rect) => {
        targets.current.set(id, rect);
      },
      open: (record, from) => start(record, from, targets.current.get(record.id) ?? defaultTarget, 'open'),
      close: (id) => {
        const source = sources.current.get(id);
        if (!source) return;
        measure(heroes.current.get(id)?.ref, (from) => {
          if (!from) return;
          measure(source.ref, (to) => {
            if (to) start(source.record, from, to, 'close');
          });
        });
      },
    };
  }, [topInset, start]);

  const onDone = useCallback((key: number) => {
    setFlight((f) => (f && f.key === key ? null : f));
  }, []);

  return (
    <ApiContext.Provider value={api}>
      <FlightContext.Provider value={flight}>
        <View style={styles.root}>
          {children}
          <BookFlightOverlay flight={flight} onDone={onDone} />
        </View>
      </FlightContext.Provider>
    </ApiContext.Provider>
  );
}

/** ReadingScreen / RereadScreen のヒーロー背表紙。位置を登録し、動いている間は隠す */
export function useHeroSpine(id: string) {
  const ref = useRef<ViewHandle>(null);
  const { registerHero, registerTarget } = useBookFlight();
  const flight = useBookFlightState();
  useEffect(() => registerHero(id, ref), [registerHero, id]);
  const onLayout = useCallback(() => {
    measure(ref, (rect) => {
      if (rect) registerTarget(id, rect);
    });
  }, [id, registerTarget]);
  return { ref, onLayout, hidden: flight?.record.id === id };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

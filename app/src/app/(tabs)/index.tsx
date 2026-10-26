import { useRouter } from 'expo-router';

import { RecordsScreen } from '../../screens/RecordsScreen';

export default function RecordsRoute() {
  const router = useRouter();

  // 背表紙のタップ先。読んでる本は「読んでる本」、それ以外は「読み返す」へ送る。
  // どちらの画面もまだ無いので、今はどちらも詳細画面。後続の Issue でここだけ差し替える。
  const openRecord = (id: string) => router.push(`/records/${id}`);

  return <RecordsScreen onAdd={() => router.push('/record/new')} onOpen={openRecord} />;
}

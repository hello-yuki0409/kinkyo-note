import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Copy,
  ClipboardPen,
  ExternalLink,
  Heart,
  Home,
  LoaderCircle,
  MapPin,
  Menu,
  MessageCircle,
  Ellipsis,
  Send,
  Share2,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  classmateInputSchema,
  type ClassmateFormValues,
  type ClassmateInput,
  type MyClassmateSummary,
  type Group,
  type PublicClassmate,
} from "../shared/classmate";
import {
  ApiError,
  createClassmate,
  fetchClassmates,
  fetchGroup,
  fetchMyClassmate,
  fetchMyClassmates,
  updateMyClassmate,
} from "./lib/api";
import { formatRelativeTime, formatShortDate } from "./lib/date";
import {
  clearClassmateDraft,
  getClassmateDraft,
  saveClassmateDraft,
} from "./lib/draft";
import {
  createLocalImageDataUrl,
  getClassmateImageMap,
  saveClassmateImageDataUrl,
} from "./lib/localImages";

const defaultSlug = "hanchu";
const publicOrigin = "https://kinkyo-note.bobu2784.workers.dev";
const heroImage = "/han-chan.jpg";
const parkImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80";
const bakeryImage =
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80";
const pendingClassmateSubmitPrefix = "kinkyo-note:pending-classmate-submit:v1:";
const emptyClassmateFormValues: ClassmateFormValues = {
  name: "",
  nickname: "",
  currentLocation: "",
  job: "",
  comment: "",
  snsUrl: "",
  visibility: "public",
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/g/${defaultSlug}`} replace />} />
      <Route
        path="/g/oita-2016"
        element={<Navigate to={`/g/${defaultSlug}`} replace />}
      />
      <Route
        path="/g/oita-2016/new"
        element={<Navigate to={`/g/${defaultSlug}/new`} replace />}
      />
      <Route
        path="/g/oita-2016/feed"
        element={<Navigate to={`/g/${defaultSlug}/feed`} replace />}
      />
      <Route path="/g/:slug" element={<GroupHomePage />} />
      <Route path="/g/:slug/new" element={<NewClassmatePage />} />
      <Route path="/g/:slug/post-login-submit" element={<PostLoginSubmitPage />} />
      <Route path="/g/:slug/feed" element={<FeedPage />} />
      <Route
        path="/g/:slug/classmates/:id/edit"
        element={<EditClassmatePage />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function GroupHomePage() {
  const { slug } = useSlugParam();
  const { group, classmates, error, isLoading, myClassmates, reload } =
    useGroupBundle(slug);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const myClassmate = myClassmates[0];
  const shareUrl = useMemo(() => {
    return `${publicOrigin}/g/${slug}`;
  }, [slug]);

  if (isLoading)
    return (
      <ScreenShell title="近況ノート">
        <LoadingState />
      </ScreenShell>
    );
  if (error)
    return (
      <ScreenShell title="近況ノート">
        <ErrorState message={error} onRetry={reload} />
      </ScreenShell>
    );
  if (!group)
    return (
      <ScreenShell title="近況ノート">
        <EmptyState message="グループが見つかりません" />
      </ScreenShell>
    );
  const currentGroup = group;

  async function handleCopyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsShareCopied(true);
      window.setTimeout(() => setIsShareCopied(false), 1800);
    } catch {
      setIsShareCopied(false);
    }
  }

  async function handleShareGroup() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentGroup.name,
          text:
            currentGroup.description ||
            "近況ノートでみんなの近況を集めています。",
          url: shareUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await handleCopyShareUrl();
  }

  return (
    <ScreenShell
      title="近況ノート"
      left={<Menu size={22} />}
      right={
        <button aria-label="共有する" onClick={handleShareGroup} type="button">
          <Share2 size={21} />
        </button>
      }
      footer={<BottomNav slug={slug} active="home" />}
    >
      <section
        className="relative -mx-5 -mt-5 min-h-64 overflow-hidden bg-stone-300"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.16), rgba(0,0,0,0.42)), url(${heroImage})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      >
        <div className="absolute inset-x-5 bottom-8 text-white">
          <span className="inline-flex rounded-full bg-green-500/90 px-4 py-1 text-sm font-semibold">
            公開中
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight drop-shadow">
            {group.name}
          </h1>
          <p className="mt-2 text-lg font-semibold drop-shadow">
            みんなの近況をシェアしよう！
          </p>
          {group.description ? (
            <p className="mt-3 max-w-[20rem] text-sm font-medium leading-6 text-white/95 drop-shadow">
              {group.description}
            </p>
          ) : null}
        </div>
      </section>

      <section className="-mt-6 rounded-t-[28px] bg-stone-50 px-3 pb-24 pt-5">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <Link
            to={
              myClassmate
                ? `/g/${slug}/classmates/${myClassmate.id}/edit`
                : `/g/${slug}/new`
            }
            className="flex h-14 items-center justify-center gap-2 rounded-md bg-green-500 text-base font-bold text-white shadow-sm"
          >
            <ClipboardPen size={20} />
            {myClassmate ? "近況を編集する" : "近況を入力する"}
          </Link>
          <Link
            to={`/g/${slug}/feed`}
            className="mt-3 flex h-14 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white text-base font-bold text-slate-900"
          >
            <Users size={20} />
            みんなの近況を見る
          </Link>
          <p className="mt-3 text-center text-xs font-semibold leading-5 text-stone-500">
            投稿にはログインが必要です。
            <br />
            投稿すると、あとから自分で編集できます。
          </p>
        </div>

        <InfoCard title="共有URL">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="break-all text-sm font-semibold leading-6 text-stone-700">
              {shareUrl}
            </p>
          </div>
          <button
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-stone-200 bg-white text-sm font-bold text-slate-900"
            onClick={handleCopyShareUrl}
            type="button"
          >
            {isShareCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            {isShareCopied ? "コピーしました" : "URLをコピー"}
          </button>
        </InfoCard>

        <InfoCard title="グループの情報">
          <InfoRow
            icon={<Bell size={17} />}
            label="作成日"
            value={formatShortDate(group.createdAt)}
          />
          <InfoRow
            icon={<Users size={17} />}
            label="メンバー数"
            value={`${classmates.length}人`}
          />
          <InfoRow
            icon={<CheckCircle2 size={17} />}
            label="公開範囲"
            value="URLを知っている人"
          />
          <button className="mt-4 flex w-full items-center justify-end gap-1 text-sm text-stone-500">
            グループのルールを見る
            <ChevronRight size={17} />
          </button>
        </InfoCard>

        <InfoCard
          title="最近の近況"
          action={<Link to={`/g/${slug}/feed`}>もっと見る</Link>}
        >
          {classmates.length === 0 ? (
            <p className="rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500">
              まだ投稿はありません。最初の近況を入力してみましょう。
            </p>
          ) : (
            <div className="space-y-3">
              {classmates.slice(0, 3).map((classmate) => (
                <Link
                  className="flex items-center justify-between rounded-md border border-stone-200 p-4"
                  key={classmate.id}
                  to={`/g/${slug}/feed`}
                >
                  <div>
                    <p className="font-semibold">{classmate.name}</p>
                    <p className="text-sm text-stone-500">
                      {classmate.comment}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-stone-400" />
                </Link>
              ))}
            </div>
          )}
        </InfoCard>
      </section>
    </ScreenShell>
  );
}

function NewClassmatePage() {
  const { slug } = useSlugParam();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCheckingExistingPost, setIsCheckingExistingPost] = useState(true);
  const defaultValues = useMemo(() => getClassmateDraft(slug), [slug]);
  const [commentLength, setCommentLength] = useState(
    defaultValues.comment.length,
  );
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClassmateFormValues, unknown, ClassmateInput>({
    resolver: zodResolver(classmateInputSchema),
    defaultValues,
  });

  useEffect(() => {
    let isActive = true;

    fetchMyClassmates(slug)
      .then((response) => {
        if (!isActive) return;

        const existingClassmate = response.classmates[0];

        if (existingClassmate) {
          navigate(`/g/${slug}/classmates/${existingClassmate.id}/edit`, {
            replace: true,
          });
          return;
        }

        setIsCheckingExistingPost(false);
      })
      .catch(() => {
        if (!isActive) return;
        setIsCheckingExistingPost(false);
      });

    return () => {
      isActive = false;
    };
  }, [navigate, slug]);

  async function onSubmit(input: ClassmateInput) {
    setSubmitError(null);
    let imageDataUrl: string | null = null;

    try {
      imageDataUrl = selectedPhoto
        ? await createLocalImageDataUrl(selectedPhoto)
        : null;
      const { classmate } = await createClassmate(slug, input);

      if (imageDataUrl) {
        saveClassmateImageDataUrl(classmate.id, imageDataUrl);
      }

      clearClassmateDraft(slug);
      navigateWithViewTransition(() => {
        navigate(`/g/${slug}/feed`, { replace: true });
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        saveClassmateDraft(slug, input);
        savePendingClassmateSubmit(slug, input, imageDataUrl);
        navigate(
          `/login?returnTo=${encodeURIComponent(`/g/${slug}/post-login-submit`)}`,
        );
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        const classmateId = error.body.classmate?.id;

        if (classmateId) {
          navigate(`/g/${slug}/classmates/${classmateId}/edit`, {
            replace: true,
          });
          return;
        }
      }

      setSubmitError(getErrorMessage(error));
    }
  }

  function handleDraftChange(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const comment = String(formData.get("comment") ?? "");

    setCommentLength(comment.length);
    saveClassmateDraft(slug, {
      name: String(formData.get("name") ?? ""),
      nickname: String(formData.get("nickname") ?? ""),
      currentLocation: String(formData.get("currentLocation") ?? ""),
      job: String(formData.get("job") ?? ""),
      comment,
      snsUrl: String(formData.get("snsUrl") ?? ""),
      visibility:
        formData.get("visibility") === "organizer_only"
          ? "organizer_only"
          : "public",
    });
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPhotoError(null);

    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      clearPhotoInput();
      setPhotoError("JPGまたはPNGを選択してください");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      clearPhotoInput();
      setPhotoError("写真は5MB以内で選択してください");
      return;
    }

    setPhotoPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return URL.createObjectURL(file);
    });
    setSelectedPhoto(file);
  }

  function clearPhotoInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setPhotoPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });
    setSelectedPhoto(null);
    setPhotoError(null);
  }

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  if (isCheckingExistingPost) {
    return (
      <ScreenShell
        title="近況を入力する"
        left={<BackButton />}
        footer={<BottomNav slug={slug} active="new" />}
      >
        <LoadingState />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="近況を入力する"
      left={<BackButton />}
      footer={<BottomNav slug={slug} active="new" />}
    >
      <form
        className="space-y-7 pb-24 pt-2"
        onChange={handleDraftChange}
        onSubmit={handleSubmit(onSubmit)}
      >
        {submitError ? <InlineError message={submitError} /> : null}

        <Field label="お名前は？" error={errors.name?.message}>
          <input
            className="input"
            placeholder="例）佐藤 健太"
            {...register("name")}
          />
        </Field>

        <Field label="当時の呼び名は？" error={errors.nickname?.message}>
          <input
            className="input"
            placeholder="例）けんちゃん"
            {...register("nickname")}
          />
        </Field>

        <Field
          label="現在どこにいますか？"
          error={errors.currentLocation?.message}
        >
          <div className="relative">
            <input
              className="input pr-11"
              placeholder="例）東京都渋谷区"
              {...register("currentLocation")}
            />
            <MapPin
              className="absolute right-4 top-3.5 text-green-500"
              size={21}
            />
          </div>
        </Field>

        <Field label="今の仕事・活動は？" error={errors.job?.message}>
          <input
            className="input"
            placeholder="例）Webエンジニア"
            {...register("job")}
          />
        </Field>

        <Field
          label="最近の近況を教えてください"
          error={errors.comment?.message}
        >
          <textarea
            className="input min-h-36 resize-none leading-7"
            maxLength={300}
            placeholder="例）最近はフリーランスとして働いています。週末は子どもと公園に行くのが楽しみです！"
            {...register("comment")}
          />
          <p className="mt-2 text-right text-sm text-stone-500">
            {commentLength} / 300
          </p>
        </Field>

        <Field label="SNS URL（任意）" error={errors.snsUrl?.message}>
          <input
            className="input"
            placeholder="https://..."
            {...register("snsUrl")}
          />
        </Field>

        <div>
          <p className="mb-3 text-sm font-bold">写真を追加（任意）</p>
          <input
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handlePhotoChange}
            ref={fileInputRef}
            type="file"
          />
          {photoPreviewUrl ? (
            <div className="relative overflow-hidden rounded-md border border-stone-200 bg-white">
              <img
                alt=""
                className="h-44 w-full object-cover"
                src={photoPreviewUrl}
              />
              <button
                aria-label="写真を削除"
                className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/95 text-stone-800 shadow"
                onClick={clearPhotoInput}
                type="button"
              >
                <X size={20} />
              </button>
              <button
                className="flex h-12 w-full items-center justify-center gap-2 text-sm font-bold text-stone-800"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Camera size={18} />
                写真を変更
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-stone-300 bg-white text-sm font-semibold text-stone-800"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={24} />
              写真を選択
            </button>
          )}
          {photoError ? (
            <p className="mt-2 text-sm font-semibold text-red-600">
              {photoError}
            </p>
          ) : null}
        </div>

        <div>
          <p className="mb-3 text-sm font-bold">公開範囲</p>
          <p className="mb-3 rounded-md bg-stone-100 p-3 text-sm font-semibold leading-6 text-stone-600">
            公開を選ぶと、共有URLを知っている人がこの近況を見られます。
          </p>
          <label className="radio-row">
            <input type="radio" value="public" {...register("visibility")} />
            公開（みんなに見える）
          </label>
          <label className="radio-row mt-3 text-stone-400">
            <input
              disabled
              type="radio"
              value="organizer_only"
              {...register("visibility")}
            />
            限定公開（幹事だけに見える）
          </label>
        </div>

        <button
          className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-green-500 text-base font-bold text-white disabled:bg-stone-300"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <LoaderCircle className="animate-spin" size={20} />
          ) : (
            <Send size={19} />
          )}
          入力内容を投稿する
        </button>
      </form>
    </ScreenShell>
  );
}

function EditClassmatePage() {
  const { slug } = useSlugParam();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const classmateId = Number(id);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentLength, setCommentLength] = useState(0);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClassmateFormValues, unknown, ClassmateInput>({
    resolver: zodResolver(classmateInputSchema),
    defaultValues: emptyClassmateFormValues,
  });

  useEffect(() => {
    let isActive = true;

    if (!Number.isInteger(classmateId) || classmateId <= 0) {
      setLoadError("投稿IDを確認してください");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    fetchMyClassmate(slug, classmateId)
      .then((response) => {
        if (!isActive) return;

        const values = {
          name: response.classmate.name,
          nickname: response.classmate.nickname,
          currentLocation: response.classmate.currentLocation,
          job: response.classmate.job,
          comment: response.classmate.comment,
          snsUrl: response.classmate.snsUrl,
          visibility:
            response.classmate.visibility === "organizer_only"
              ? "organizer_only"
              : "public",
        } satisfies ClassmateFormValues;

        reset(values);
        setCommentLength(values.comment.length);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!isActive) return;

        if (error instanceof ApiError && error.status === 401) {
          navigate(
            `/login?returnTo=${encodeURIComponent(`/g/${slug}/classmates/${classmateId}/edit`)}`,
          );
          return;
        }

        setLoadError(getErrorMessage(error));
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [classmateId, navigate, reset, slug]);

  async function onSubmit(input: ClassmateInput) {
    setSubmitError(null);
    try {
      await updateMyClassmate(slug, classmateId, input);
      navigateWithViewTransition(() => {
        navigate(`/g/${slug}/feed`, { replace: true });
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate(
          `/login?returnTo=${encodeURIComponent(`/g/${slug}/classmates/${classmateId}/edit`)}`,
        );
        return;
      }

      setSubmitError(getErrorMessage(error));
    }
  }

  function handleFormChange(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    setCommentLength(String(formData.get("comment") ?? "").length);
  }

  return (
    <ScreenShell
      title="近況を編集する"
      left={<BackButton />}
      footer={<BottomNav slug={slug} active="feed" />}
    >
      {isLoading ? <LoadingState /> : null}
      {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
      {!isLoading && !loadError ? (
        <form
          className="space-y-7 pb-24 pt-2"
          onChange={handleFormChange}
          onSubmit={handleSubmit(onSubmit)}
        >
          {submitError ? <InlineError message={submitError} /> : null}

          <Field label="お名前は？" error={errors.name?.message}>
            <input
              className="input"
              placeholder="例）佐藤 健太"
              {...register("name")}
            />
          </Field>

          <Field label="当時の呼び名は？" error={errors.nickname?.message}>
            <input
              className="input"
              placeholder="例）けんちゃん"
              {...register("nickname")}
            />
          </Field>

          <Field
            label="現在どこにいますか？"
            error={errors.currentLocation?.message}
          >
            <div className="relative">
              <input
                className="input pr-11"
                placeholder="例）東京都渋谷区"
                {...register("currentLocation")}
              />
              <MapPin
                className="absolute right-4 top-3.5 text-green-500"
                size={21}
              />
            </div>
          </Field>

          <Field label="今の仕事・活動は？" error={errors.job?.message}>
            <input
              className="input"
              placeholder="例）Webエンジニア"
              {...register("job")}
            />
          </Field>

          <Field
            label="最近の近況を教えてください"
            error={errors.comment?.message}
          >
            <textarea
              className="input min-h-36 resize-none leading-7"
              maxLength={300}
              placeholder="例）最近はフリーランスとして働いています。週末は子どもと公園に行くのが楽しみです！"
              {...register("comment")}
            />
            <p className="mt-2 text-right text-sm text-stone-500">
              {commentLength} / 300
            </p>
          </Field>

          <Field label="SNS URL（任意）" error={errors.snsUrl?.message}>
            <input
              className="input"
              placeholder="https://..."
              {...register("snsUrl")}
            />
          </Field>

          <div>
            <p className="mb-3 text-sm font-bold">公開範囲</p>
            <p className="mb-3 rounded-md bg-stone-100 p-3 text-sm font-semibold leading-6 text-stone-600">
              公開を選ぶと、共有URLを知っている人がこの近況を見られます。
            </p>
            <label className="radio-row">
              <input type="radio" value="public" {...register("visibility")} />
              公開（みんなに見える）
            </label>
            <label className="radio-row mt-3 text-stone-400">
              <input
                disabled
                type="radio"
                value="organizer_only"
                {...register("visibility")}
              />
              限定公開（幹事だけに見える）
            </label>
          </div>

          <button
            className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-green-500 text-base font-bold text-white disabled:bg-stone-300"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" size={20} />
            ) : (
              <CheckCircle2 size={19} />
            )}
            変更を保存する
          </button>
          <Link
            className="flex h-12 w-full items-center justify-center rounded-md border border-stone-200 bg-white text-sm font-bold text-stone-800"
            to={`/g/${slug}/feed`}
          >
            キャンセル
          </Link>
        </form>
      ) : null}
    </ScreenShell>
  );
}

function PostLoginSubmitPage() {
  const { slug } = useSlugParam();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const pendingSubmit = getPendingClassmateSubmit(slug);

    if (!pendingSubmit) {
      navigate(`/g/${slug}/feed`, { replace: true });
      return;
    }

    const submit = pendingSubmit;

    async function submitPendingPost() {
      try {
        const { classmate } = await createClassmate(slug, submit.input);

        if (submit.imageDataUrl) {
          saveClassmateImageDataUrl(classmate.id, submit.imageDataUrl);
        }

        clearPendingClassmateSubmit(slug);
        clearClassmateDraft(slug);

        if (!isActive) return;
        navigate(`/g/${slug}/feed`, { replace: true });
      } catch (error) {
        if (!isActive) return;

        if (error instanceof ApiError && error.status === 401) {
          navigate(
            `/login?returnTo=${encodeURIComponent(`/g/${slug}/post-login-submit`)}`,
            { replace: true },
          );
          return;
        }

        if (error instanceof ApiError && error.status === 409) {
          const classmateId = error.body.classmate?.id;
          clearPendingClassmateSubmit(slug);

          if (classmateId) {
            navigate(`/g/${slug}/classmates/${classmateId}/edit`, {
              replace: true,
            });
            return;
          }
        }

        setSubmitError(getErrorMessage(error));
      }
    }

    void submitPendingPost();

    return () => {
      isActive = false;
    };
  }, [navigate, slug]);

  return (
    <ScreenShell
      title="近況を投稿する"
      left={<BackButton />}
      footer={<BottomNav slug={slug} active="new" />}
    >
      {submitError ? (
        <div className="space-y-4">
          <ErrorState message={submitError} />
          <Link
            className="flex h-12 items-center justify-center rounded-md bg-green-500 text-sm font-bold text-white"
            to={`/g/${slug}/new`}
          >
            入力画面へ戻る
          </Link>
        </div>
      ) : (
        <div className="pb-24">
          <LoadingState />
          <p className="text-center text-sm font-semibold text-stone-500">
            投稿しています
          </p>
        </div>
      )}
    </ScreenShell>
  );
}

function LoginPage() {
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const backTo = getLoginBackTo(returnTo);
  const loginUrl = `/api/oauth/line/authorization?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <ScreenShell title="ログイン" left={<BackButton />}>
      <section className="pb-10 pt-8">
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <h1 className="text-xl font-bold">投稿を保存するためにログイン</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-stone-600">
            ログインすると、あとから自分の近況を編集できます。
          </p>
          <a
            className="mt-6 flex h-14 items-center justify-center rounded-md bg-green-500 text-base font-bold text-white"
            href={loginUrl}
          >
            LINEで続ける
          </a>
          <Link
            className="mt-3 flex h-12 items-center justify-center rounded-md border border-stone-200 bg-white text-sm font-bold text-stone-800"
            to={backTo}
          >
            戻る
          </Link>
        </div>
      </section>
    </ScreenShell>
  );
}

function FeedPage() {
  const { slug } = useSlugParam();
  const { classmates, error, isLoading, myClassmates, reload } =
    useClassmates(slug);
  const [order, setOrder] = useState<"new" | "old">("new");
  const [imageByClassmateId] = useState(() => getClassmateImageMap());
  const myClassmateIds = useMemo(() => {
    return new Set(myClassmates.map((classmate) => classmate.id));
  }, [myClassmates]);
  const sortedClassmates = useMemo(() => {
    return [...classmates].sort((a, b) => {
      const diff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return order === "new" ? diff : -diff;
    });
  }, [classmates, order]);

  return (
    <ScreenShell
      title="みんなの近況"
      left={<BackButton />}
      right={<SlidersHorizontal size={21} />}
      footer={<BottomNav slug={slug} active="feed" />}
    >
      <div className="sticky top-[64px] z-10 -mx-5 bg-white">
        <div className="grid grid-cols-2 border-b border-stone-200 text-sm font-semibold">
          <button
            className={`h-12 ${order === "new" ? "border-b-2 border-green-500 text-green-600" : "text-stone-500"}`}
            onClick={() => setOrder("new")}
            type="button"
          >
            新しい順
          </button>
          <button
            className={`h-12 ${order === "old" ? "border-b-2 border-green-500 text-green-600" : "text-stone-500"}`}
            onClick={() => setOrder("old")}
            type="button"
          >
            古い順
          </button>
        </div>
      </div>

      <section className="space-y-4 pb-24 pt-4">
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!isLoading && !error && sortedClassmates.length === 0 ? (
          <EmptyState message="まだ公開中の近況はありません" />
        ) : null}
        {sortedClassmates.map((classmate, index) => (
          <ClassmateCard
            canEdit={myClassmateIds.has(classmate.id)}
            classmate={classmate}
            imageUrl={
              imageByClassmateId[String(classmate.id)] ??
              (index % 2 === 0 ? parkImage : bakeryImage)
            }
            key={classmate.id}
            slug={slug}
          />
        ))}
      </section>
    </ScreenShell>
  );
}

const ClassmateCard = memo(function ClassmateCard({
  canEdit,
  classmate,
  imageUrl,
  slug,
}: {
  canEdit: boolean;
  classmate: PublicClassmate;
  imageUrl: string;
  slug: string;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const initials = classmate.name.slice(0, 1);

  return (
    <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-green-100 text-lg font-bold text-green-700">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">{classmate.name}</h2>
              <p className="text-sm text-stone-500">
                {formatRelativeTime(classmate.createdAt)}
              </p>
            </div>
            {canEdit ? (
              <div className="relative shrink-0">
                <button
                  aria-expanded={isMenuOpen}
                  aria-label="投稿メニューを開く"
                  className="grid size-9 place-items-center rounded-full text-stone-600 hover:bg-stone-100"
                  onClick={() => setIsMenuOpen((value) => !value)}
                  type="button"
                >
                  <Ellipsis size={21} />
                </button>
                {isMenuOpen ? (
                  <div className="absolute right-0 top-10 z-10 w-32 overflow-hidden rounded-md border border-stone-200 bg-white py-1 text-sm font-bold shadow-lg">
                    <Link
                      className="flex h-11 items-center gap-2 px-4 text-stone-800 hover:bg-stone-50"
                      onClick={() => setIsMenuOpen(false)}
                      to={`/g/${slug}/classmates/${classmate.id}/edit`}
                    >
                      <ClipboardPen size={17} />
                      編集
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <MapPin size={17} />
              {classmate.currentLocation}
            </p>
            <p className="flex items-center gap-2 font-semibold">
              <BriefcaseBusiness size={17} />
              {classmate.job}
            </p>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7">
            {classmate.comment}
          </p>
          {classmate.snsUrl ? (
            <a
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-green-700"
              href={classmate.snsUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              <ExternalLink size={17} />
              SNSを見る
            </a>
          ) : null}
        </div>
      </div>
      <img
        alt=""
        className="mt-4 h-28 w-full rounded-md object-cover"
        loading="lazy"
        src={imageUrl}
      />
      <div className="mt-3 flex gap-6 text-sm text-stone-600">
        <span className="flex items-center gap-1">
          <Heart size={18} />
          いいね 0
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={18} />
          コメント 0
        </span>
      </div>
    </article>
  );
});

function ScreenShell({
  children,
  footer,
  left,
  right,
  title,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto min-h-screen max-w-md bg-stone-50 shadow-2xl">
        <header className="sticky top-0 z-20 grid h-16 grid-cols-[48px_1fr_48px] items-center border-b border-stone-200 bg-white/95 px-2 backdrop-blur">
          <div className="grid place-items-center">{left}</div>
          <p className="text-center text-lg font-bold">{title}</p>
          <div className="grid place-items-center">{right}</div>
        </header>
        <div className="px-5 py-5">{children}</div>
        {footer}
      </div>
    </main>
  );
}

function BottomNav({
  active,
  slug,
}: {
  active: "home" | "new" | "feed";
  slug: string;
}) {
  const items = [
    { id: "home", label: "ホーム", icon: Home, to: `/g/${slug}` },
    {
      id: "new",
      label: "近況を入力",
      icon: ClipboardPen,
      to: `/g/${slug}/new`,
    },
    { id: "feed", label: "みんなの近況", icon: Users, to: `/g/${slug}/feed` },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid h-20 max-w-md grid-cols-3 border-t border-stone-200 bg-white pb-3 pt-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        return (
          <NavLink
            className={`flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
              isActive ? "text-green-600" : "text-slate-700"
            }`}
            key={item.id}
            to={item.to}
          >
            <Icon size={24} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function InfoCard({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mt-5 rounded-lg bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {action ? (
          <div className="text-sm font-semibold text-stone-500">{action}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="flex items-center gap-2 text-stone-700">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-3 block text-sm font-bold">{label}</span>
      {children}
      {error ? (
        <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
      ) : null}
    </label>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-80 place-items-center text-stone-500">
      <LoaderCircle className="animate-spin" size={32} />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-red-800">
      <CircleAlert size={24} />
      <p className="mt-3 font-bold">読み込みに失敗しました</p>
      <p className="mt-2 text-sm leading-6">{message}</p>
      {onRetry ? (
        <button
          className="mt-4 h-11 rounded-md bg-red-600 px-5 text-sm font-bold text-white"
          onClick={onRetry}
          type="button"
        >
          再読み込み
        </button>
      ) : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm font-semibold text-stone-500">
      {message}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

function BackButton() {
  const navigate = useNavigate();

  return (
    <button aria-label="戻る" onClick={() => navigate(-1)} type="button">
      <ArrowLeft size={23} />
    </button>
  );
}

function NotFoundPage() {
  return (
    <ScreenShell title="近況ノート">
      <EmptyState message="ページが見つかりません" />
      <Link
        className="mt-4 flex h-12 items-center justify-center rounded-md bg-green-500 font-bold text-white"
        to={`/g/${defaultSlug}`}
      >
        ホームへ戻る
      </Link>
    </ScreenShell>
  );
}

function useSlugParam() {
  const { slug } = useParams<{ slug: string }>();
  return { slug: slug ?? defaultSlug };
}

function useGroupBundle(slug: string) {
  const [state, setState] = useState<{
    group: Group | null;
    classmates: PublicClassmate[];
    myClassmates: MyClassmateSummary[];
    error: string | null;
    isLoading: boolean;
  }>({
    group: null,
    classmates: [],
    myClassmates: [],
    error: null,
    isLoading: true,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let isActive = true;
    setState((currentState) => {
      if (currentState.isLoading && currentState.error === null) {
        return currentState;
      }

      return {
        ...currentState,
        error: null,
        isLoading: true,
      };
    });

    Promise.all([
      fetchGroup(slug),
      fetchClassmates(slug),
      fetchMyClassmates(slug).catch(() => ({ classmates: [] })),
    ])
      .then(([groupResponse, classmatesResponse, myClassmatesResponse]) => {
        if (!isActive) return;
        setState({
          group: groupResponse.group,
          classmates: classmatesResponse.classmates,
          myClassmates: myClassmatesResponse.classmates,
          error: null,
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState((currentState) => ({
          ...currentState,
          error: getErrorMessage(error),
          isLoading: false,
        }));
      });

    return () => {
      isActive = false;
    };
  }, [slug, reloadKey]);

  return {
    ...state,
    reload,
  };
}

function useClassmates(slug: string) {
  const [state, setState] = useState<{
    classmates: PublicClassmate[];
    myClassmates: MyClassmateSummary[];
    error: string | null;
    isLoading: boolean;
  }>({
    classmates: [],
    myClassmates: [],
    error: null,
    isLoading: true,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let isActive = true;
    setState((currentState) => {
      if (currentState.isLoading && currentState.error === null) {
        return currentState;
      }

      return {
        ...currentState,
        error: null,
        isLoading: true,
      };
    });

    Promise.all([
      fetchClassmates(slug),
      fetchMyClassmates(slug).catch(() => ({ classmates: [] })),
    ])
      .then(([classmatesResponse, myClassmatesResponse]) => {
        if (!isActive) return;
        setState({
          classmates: classmatesResponse.classmates,
          myClassmates: myClassmatesResponse.classmates,
          error: null,
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState((currentState) => ({
          ...currentState,
          error: getErrorMessage(error),
          isLoading: false,
        }));
      });

    return () => {
      isActive = false;
    };
  }, [slug, reloadKey]);

  return {
    ...state,
    reload,
  };
}

type PendingClassmateSubmit = {
  imageDataUrl: string | null;
  input: ClassmateInput;
};

function savePendingClassmateSubmit(
  slug: string,
  input: ClassmateInput,
  imageDataUrl: string | null,
) {
  try {
    sessionStorage.setItem(
      getPendingClassmateSubmitKey(slug),
      JSON.stringify({ imageDataUrl, input } satisfies PendingClassmateSubmit),
    );
  } catch {
    // If storage is unavailable, the login flow will fall back to the draft.
  }
}

function getPendingClassmateSubmit(slug: string): PendingClassmateSubmit | null {
  try {
    const rawValue = sessionStorage.getItem(getPendingClassmateSubmitKey(slug));
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue) as Partial<PendingClassmateSubmit>;
    const input = classmateInputSchema.parse(parsedValue.input);

    return {
      imageDataUrl:
        typeof parsedValue.imageDataUrl === "string"
          ? parsedValue.imageDataUrl
          : null,
      input,
    };
  } catch {
    return null;
  }
}

function clearPendingClassmateSubmit(slug: string) {
  try {
    sessionStorage.removeItem(getPendingClassmateSubmitKey(slug));
  } catch {
    // Ignore storage cleanup failures.
  }
}

function getPendingClassmateSubmitKey(slug: string) {
  return `${pendingClassmateSubmitPrefix}${slug}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "予期しないエラーが発生しました";
}

function sanitizeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return `/g/${defaultSlug}`;
  }

  return value;
}

function getLoginBackTo(returnTo: string) {
  const postLoginSubmitMatch = returnTo.match(
    /^\/g\/([^/]+)\/post-login-submit$/,
  );

  if (postLoginSubmitMatch) {
    return `/g/${postLoginSubmitMatch[1]}/new`;
  }

  return returnTo;
}

function navigateWithViewTransition(callback: () => void) {
  const documentWithTransition = document as Document & {
    startViewTransition?: (callback: () => void) => void;
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    callback();
    return;
  }

  if (documentWithTransition.startViewTransition) {
    documentWithTransition.startViewTransition(callback);
    return;
  }

  callback();
}

export default App;

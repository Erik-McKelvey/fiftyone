import { Sample } from "@fiftyone/looker/src/state";
import {
  MediaType,
  datasetFragment,
  datasetFragment$key,
  frameFieldsFragment,
  frameFieldsFragment$data,
  frameFieldsFragment$key,
  graphQLSyncFragmentAtom,
  mediaTypeFragment,
  mediaTypeFragment$key,
  sampleFieldsFragment,
  sampleFieldsFragment$data,
  sampleFieldsFragment$key,
} from "@fiftyone/relay";
import { StrictField } from "@fiftyone/utilities";
import { AtomEffect, DefaultValue, atom, atomFamily, selector } from "recoil";
import { ModalSample } from "..";
import { SPACES_DEFAULT, sessionAtom } from "../session";
import { collapseFields, transformDataset } from "../utils";
import { groupMediaTypesSet } from "./groups";
import { State } from "./types";
import { getBrowserStorageEffectForKey } from "./customEffects";

export const refresher = atom<number>({
  key: "refresher",
  default: 0,
});

export const modal = (() => {
  let modal: ModalSample | null = null;
  return graphQLSyncFragmentAtom<datasetFragment$key, ModalSample | null>(
    {
      fragments: [datasetFragment],
      keys: ["dataset"],
      read: (data, previous) => {
        if (data.id !== previous?.id) {
          modal = null;
        }

        return modal;
      },
      default: null,
    },
    {
      key: "modal",
      effects: [
        ({ onSet }) => {
          onSet((value) => {
            modal = value;
          });
        },
      ],
    }
  );
})();

export interface SortResults {
  count: boolean;
  asc: boolean;
}

export const sortFilterResults = atomFamily<SortResults, boolean>({
  key: "sortFilterResults",
  default: {
    count: true,
    asc: false,
  },
});

export const cropToContent = atomFamily<boolean, boolean>({
  key: "cropToContent",
  default: true,
});

export const fullscreen = atom<boolean>({
  key: "fullscreen",
  default: false,
});

export const showOverlays = atom<boolean>({
  key: "showOverlays",
  default: true,
});

export const teams = atom({
  key: "teams",
  default: {
    open: false,
    submitted: false,
    minimized: false,
  },
});

export const activePlot = atom<string>({
  key: "activePlot",
  default: "Labels",
});

export const loading = atom<boolean>({
  key: "loading",
  default: false,
});

// labels: whether label tag or sample tag
export const tagging = atomFamily<boolean, { modal: boolean; labels: boolean }>(
  {
    key: "tagging",
    default: false,
  }
);

/**
 * The state of the current dataset. Contains informations about the dataset, and the samples contained in it.
 *
 * See :py:class:\`fiftyone.core.dataset.Dataset\` for python documentation.
 */
export const dataset = graphQLSyncFragmentAtom<
  datasetFragment$key,
  State.Dataset | null
>(
  {
    fragments: [datasetFragment],
    keys: ["dataset"],
    read: (dataset) => {
      return { ...transformDataset(dataset) };
    },
    default: null,
  },
  {
    key: "dataset",
  }
);

export const mediaType = graphQLSyncFragmentAtom<
  mediaTypeFragment$key,
  MediaType | null
>(
  {
    fragments: [datasetFragment, mediaTypeFragment],
    keys: ["dataset"],
    read: (data) => data.mediaType,
    default: null,
  },
  {
    key: "mediaType",
  }
);

export const flatSampleFields = graphQLSyncFragmentAtom<
  sampleFieldsFragment$key,
  sampleFieldsFragment$data["sampleFields"]
>(
  {
    fragments: [datasetFragment, sampleFieldsFragment],
    keys: ["dataset"],
    read: (data) => data.sampleFields,
    default: [],
  },
  {
    key: "flatSampleFields",
  }
);

export const sampleFields = selector<StrictField[]>({
  key: "sampleFields",
  get: ({ get }) => collapseFields(get(flatSampleFields) || []),
});

export const flatFrameFields = graphQLSyncFragmentAtom<
  frameFieldsFragment$key,
  frameFieldsFragment$data["frameFields"]
>(
  {
    fragments: [datasetFragment, frameFieldsFragment],
    keys: ["dataset"],
    read: (data) => data.frameFields,
    default: [],
  },
  {
    key: "flatFrameFields",
  }
);

export const frameFields = selector<StrictField[]>({
  key: "frameFields",
  get: ({ get }) => collapseFields(get(flatFrameFields) || []),
});

export const selectedViewName = atom<string>({
  key: "selectedViewName",
  default: null,
});

export const selectedLabels = sessionAtom({
  key: "selectedLabels",
  default: [],
});

export const selectedSamples = sessionAtom({
  key: "selectedSamples",
  default: new Set<string>(),
});

export const selectedSampleObjects = atom<Map<string, Sample>>({
  key: "selectedSampleObjects",
  default: new Map(),
});

// only used in extended view, for tagging purpose
export const hiddenLabels = atom<State.SelectedLabelMap>({
  key: "hiddenLabels",
  default: {},
});

export const stageInfo = atom({
  key: "stageInfo",
  default: undefined,
});

export const viewCounter = atom({
  key: "viewCounter",
  default: 0,
});

export const DEFAULT_ALPHA = 0.7;

export const colorSeed = atom<number>({
  key: "colorSeed",
  default: 0,
});

export const appTeamsIsOpen = atom({
  key: "appTeamsIsOpen",
  default: false,
});

export const savedLookerOptions = atom({
  key: "savedLookerOptions",
  default: {},
});

export const patching = atom<boolean>({
  key: "patching",
  default: false,
});

export const savingFilters = atom<boolean>({
  key: "savingFilters",
  default: false,
});

export const similaritySorting = atom<boolean>({
  key: "similaritySorting",
  default: false,
});

export const extendedSelection = atom<{ selection: string[]; scope?: string }>({
  key: "extendedSelection",
  default: { selection: null },
});
export const extendedSelectionOverrideStage = atom<any>({
  key: "extendedSelectionOverrideStage",
  default: null,
});

export const similarityParameters = (() => {
  let update = false;
  let parameters: State.SortBySimilarityParameters | null = null;

  return graphQLSyncFragmentAtom<
    datasetFragment$key,
    State.SortBySimilarityParameters | null
  >(
    {
      fragments: [datasetFragment],
      keys: ["dataset"],
      read: (data, previous) => {
        if (data.id !== previous?.id && !update) {
          parameters = null;
        }
        update = false;

        return parameters;
      },
      default: null,
      selectorEffect: (newValue) => {
        update = true;
        parameters = newValue instanceof DefaultValue ? null : newValue;
      },
    },
    {
      key: "similarityParameters",
    }
  );
})();

export const modalTopBarVisible = atom<boolean>({
  key: "modalTopBarVisible",
  default: true,
});

export const hoveredSample = atom<Sample>({
  key: "hoveredSample",
  default: null,
});

export const lastLoadedDatasetNameState = atom<string>({
  key: "lastLoadedDatasetNameState",
  default: "",
});

export const lookerPanels = atom({
  key: "lookerPanels",
  default: {
    json: { isOpen: false },
    help: { isOpen: false },
  },
});

export const groupMediaIsCarouselVisibleSetting = atom<boolean>({
  key: "groupMediaIsCarouselVisibleSetting",
  default: true,
  effects: [
    getBrowserStorageEffectForKey("groupMediaIsCarouselVisible", {
      sessionStorage: true,
      valueClass: "boolean",
    }),
  ],
});

export const groupMedia3dVisibleSetting = atom<boolean>({
  key: "groupMediaIs3dVisibleSetting",
  default: true,
  effects: [
    getBrowserStorageEffectForKey("groupMediaIs3DVisible", {
      sessionStorage: true,
      valueClass: "boolean",
    }),
  ],
});

export const onlyPcd = selector<boolean>({
  key: "onlyPcd",
  get: ({ get }) => {
    const set = get(groupMediaTypesSet);
    const hasPcd = set.has("point_cloud");
    return set.size === 1 && hasPcd;
  },
});

export const groupMediaIs3dVisible = selector<boolean>({
  key: "groupMedia3dVisible",
  get: ({ get }) => {
    const set = get(groupMediaTypesSet);
    const hasPcd = set.has("point_cloud");
    return get(groupMedia3dVisibleSetting) && hasPcd;
  },
});

export const groupMediaIsMainVisibleSetting = atom<boolean>({
  key: "groupMediaIsMainVisibleSetting",
  default: true,
  effects: [
    getBrowserStorageEffectForKey("groupMediaIsMainVisible", {
      sessionStorage: true,
      valueClass: "boolean",
    }),
  ],
});

export const groupMediaIsMainVisible = selector<boolean>({
  key: "groupMediaIsMainVisible",
  get: ({ get }) => {
    const set = get(groupMediaTypesSet);
    const hasPcd = set.has("point_cloud");
    return get(groupMediaIsMainVisibleSetting) && (!hasPcd || set.size > 1);
  },
});

export const theme = atom<"dark" | "light">({
  key: "theme",
  default: "dark",
  effects: [getBrowserStorageEffectForKey("mui-mode")],
});

export const canEditSavedViews = sessionAtom({
  key: "canEditSavedViews",
  default: true,
});

export const canEditCustomColors = sessionAtom({
  key: "canEditCustomColors",
  default: true,
});

export const readOnly = sessionAtom({
  key: "readOnly",
  default: false,
});

export const sessionSpaces = sessionAtom({
  key: "sessionSpaces",
  default: SPACES_DEFAULT,
});

export const colorScheme = sessionAtom({
  key: "colorScheme",
});

// sidebar filter vs. visibility mode
export const isSidebarFilterMode = atom<boolean>({
  key: "isSidebarFilterMode",
  default: true,
});

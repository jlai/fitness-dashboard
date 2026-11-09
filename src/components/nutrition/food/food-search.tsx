"use client";

import {
  Alert,
  Autocomplete,
  AutocompleteChangeReason,
  Chip,
  CircularProgress,
  Fade,
  TextField,
  createFilterOptions,
} from "@mui/material";
import {
  History as HistoryIcon,
  Star as FavoriteIcon,
  Repeat as RepeatIcon,
  Person as CustomIcon,
} from "@mui/icons-material";
import { ChefHat as ChefHatIcon } from "@material-symbols-svg/react/icons/chef-hat";
import { SyntheticEvent, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useController, UseControllerProps } from "react-hook-form";
import { uniqBy } from "es-toolkit";

import {
  buildFavoriteFoodsQuery,
  buildRecentFoodsQuery,
  buildSearchFoodsQuery,
} from "@/api/nutrition/search";
import { Food } from "@/api/nutrition";
import { mapFoodDataPoint } from "@/api/nutrition/helpers";
import { formatFoodName } from "@/utils/other-formats";
import { clientOnlyFoodsAtom } from "@/storage/client-only-foods";
import { clientOnlyFavoriteFoodsAtom } from "@/storage/client-only-favorite-foods";
import { settingsStorageEpochAtom } from "@/storage/settings-storage";
import { useAtomValue } from "jotai";

type FoodOption = Food & {
  recent?: boolean;
  favorite?: boolean;
  frequent?: boolean;
  template?: boolean;
};

type SearchOption = {
  foodId: string;
  search: true;
  name: string;
};

function isSearchOption(
  option: FoodOption | SearchOption | null,
): option is SearchOption {
  return option ? "search" in option && option.search === true : false;
}

const filterOptions = createFilterOptions<FoodOption | SearchOption | null>();

function ShrinkingChip({
  icon,
  label,
}: {
  icon: React.ReactElement;
  label: string;
}) {
  return (
    <>
      <Chip className="hidden md:flex" label={label} icon={icon} />
      <div className="md:hidden">{icon}</div>
    </>
  );
}

function FoodOptionDisplay({
  option,
}: {
  option: FoodOption | SearchOption | null;
}) {
  if (!option) {
    return <></>;
  }

  if (isSearchOption(option)) {
    return <div>{option.name}</div>;
  }

  return (
    <div className="flex flex-row items-center w-full">
      <div className="flex-1">
        <span>
          {option.name} {option.brand && <span>({option.brand})</span>}
        </span>
        <span className="text-slate-500 text-opacity-80 ms-2 text-xs">
          {option.calories} cal
        </span>
      </div>
      <div className="text-slate-500 flex flex-row md:gap-x-2 items-center">
        {option.favorite && (
          <ShrinkingChip label="Favorite" icon={<FavoriteIcon />} />
        )}
        {option.template && (
          <ShrinkingChip label="Template" icon={<ChefHatIcon />} />
        )}
        {option.accessLevel === "PRIVATE" && !option.template && (
          <ShrinkingChip label="Custom" icon={<CustomIcon />} />
        )}
        {option.recent && (
          <ShrinkingChip label="Recent" icon={<HistoryIcon />} />
        )}
        {option.frequent && (
          <ShrinkingChip label="Frequent" icon={<RepeatIcon />} />
        )}
      </div>
    </div>
  );
}

function SearchOptionDisplay({
  option,
  isSearching,
  noResults,
}: {
  option: SearchOption;
  isSearching: boolean;
  noResults: boolean;
}) {
  return (
    <div className="flex flex-row w-full">
      <div className="flex-1">
        {noResults ? (
          <Alert severity="info">
            No results found. This may be a bug in the Fitbit Web API.
          </Alert>
        ) : (
          option.name
        )}
      </div>
      {isSearching && (
        <Fade in>
          <CircularProgress size="1.5rem" />
        </Fade>
      )}
    </div>
  );
}

export default function SearchFoods({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: Food | null;
  onChange?: (food: Food | null) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [searchString, setSearchString] = useState<string | null>(null);

  const { clientOnlyFavoriteFoods } = useAtomValue(clientOnlyFavoriteFoodsAtom);
  const { clientOnlyFoods } = useAtomValue(clientOnlyFoodsAtom);
  const storageEpoch = useAtomValue(settingsStorageEpochAtom);
  const { data: favoriteFoods, isError: favoriteFoodsError } = useQuery(
    buildFavoriteFoodsQuery(
      clientOnlyFavoriteFoods.map(({ foodId }) => foodId),
      clientOnlyFoods,
      storageEpoch,
    ),
  );
  const { data: recentFoods, isError: recentFoodsError } = useQuery(
    buildRecentFoodsQuery(),
  );

  const {
    data: searchResults,
    isFetching: searchPending,
    isSuccess,
  } = useQuery({
    ...buildSearchFoodsQuery(searchString ?? ""),
    enabled: !!searchString,
  });

  const handleChange = useCallback(
    (
      event: SyntheticEvent,
      value: FoodOption | SearchOption | null,
      reason: AutocompleteChangeReason,
    ) => {
      if (isSearchOption(value)) {
        setInputValue(inputValue);
        setSearchString(inputValue);
        return;
      }

      onChange?.(value);
    },
    [onChange, inputValue],
  );

  const handleInputChange = useCallback(
    (event: SyntheticEvent, value: string) => {
      setInputValue(value);
    },
    [],
  );

  const handleEnter = useCallback(
    (
      event: React.KeyboardEvent<HTMLDivElement> & {
        defaultMuiPrevented?: boolean;
      },
    ) => {
      if (event.key === "Enter") {
        event.defaultMuiPrevented = true;
        event.preventDefault();
        setSearchString(inputValue);
      }
    },
    [setSearchString, inputValue],
  );

  const allOptions = useMemo(() => {
    const favoriteIds = new Set(
      clientOnlyFavoriteFoods.map(({ foodId }) => foodId),
    );
    const recentIds = new Set((recentFoods ?? []).map(({ foodId }) => foodId));
    const templateIds = new Set(
      clientOnlyFoods.map((food) => mapFoodDataPoint(food).foodId),
    );
    return [
      ...(favoriteFoods ?? []).filter((food) => !food.unavailable),
      ...clientOnlyFoods.map((food) => mapFoodDataPoint(food)),
      ...(recentFoods ?? []),
      ...(searchResults?.foods ?? []),
    ].map((food) => ({
      ...food,
      favorite: favoriteIds.has(food.foodId),
      recent: recentIds.has(food.foodId),
      template: templateIds.has(food.foodId),
    }));
  }, [
    favoriteFoods,
    clientOnlyFoods,
    recentFoods,
    searchResults,
    clientOnlyFavoriteFoods,
  ]);

  return (
    <div className={className}>
      {(favoriteFoodsError ||
        favoriteFoods?.some((food) => food.unavailable)) && (
        <Alert severity="error">Could not load favorite foods.</Alert>
      )}
      {recentFoodsError && (
        <Alert severity="error">Could not load recent foods.</Alert>
      )}
      <Autocomplete<FoodOption | SearchOption | null>
        loading={searchPending}
        value={value}
        onKeyDown={handleEnter}
        inputValue={inputValue}
        getOptionDisabled={isSearchOption}
        onInputChange={handleInputChange}
        options={allOptions}
        onChange={handleChange}
        isOptionEqualToValue={(option, value) =>
          (option && value && option.foodId === value.foodId) ?? false
        }
        getOptionLabel={(option) => {
          if (!option) {
            return "";
          }

          if (isSearchOption(option)) {
            return option.name;
          } else {
            return formatFoodName(option.name, option.brand);
          }
        }}
        renderInput={(params) => (
          <TextField
            type="search"
            label="Select a food"
            placeholder="Type to search ..."
            {...params}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option && option.foodId}>
            {isSearchOption(option) ? (
              <SearchOptionDisplay
                option={option}
                isSearching={searchPending}
                noResults={isSuccess && searchResults?.foods?.length === 0}
              />
            ) : (
              <FoodOptionDisplay option={option} />
            )}
          </li>
        )}
        filterOptions={(options, params) => {
          const showSearchOption = !!params.inputValue;

          options = filterOptions(options, params);

          if (showSearchOption) {
            let searchOptions = [
              {
                foodId: "-1",
                search: true,
                name: `Press enter to search for "${params.inputValue}" ...`,
              } as SearchOption,
            ];

            if (isSuccess && searchResults.foods?.length === 0) {
              searchOptions = [
                {
                  foodId: "-2",
                  search: true,
                  name: `No foods found. NOTE: This may be a Fitbit API bug.`,
                } as SearchOption,
              ];
            }

            options = [...searchOptions, ...options];
          }

          // Dedupe
          options = uniqBy(options, (option) => option?.foodId);

          return options;
        }}
      />
    </div>
  );
}

export function SearchFoodsElement(controllerProps: UseControllerProps) {
  const { field } = useController(controllerProps);

  return <SearchFoods value={field.value} onChange={field.onChange} />;
}

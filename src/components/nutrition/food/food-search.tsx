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
import { SyntheticEvent, useCallback, useMemo, useState } from "react";
import {
  QueryClient,
  queryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useController, UseControllerProps } from "react-hook-form";
import { uniqBy } from "lodash";

import {
  buildCustomFoodsQuery,
  buildFavoriteFoodsQuery,
  buildFrequentFoodsQuery,
  buildRecentFoodsQuery,
  buildSearchFoodsQuery,
} from "@/api/nutrition/search";
import { Food } from "@/api/nutrition";
import { formatFoodName } from "@/utils/other-formats";

type FoodOption = Food & {
  recent?: boolean;
  favorite?: boolean;
  frequent?: boolean;
};

type SearchOption = {
  foodId: number;
  search: true;
  name: string;
};

function isSearchOption(
  option: FoodOption | SearchOption | null
): option is SearchOption {
  return option ? "search" in option && option.search === true : false;
}

const filterOptions = createFilterOptions<FoodOption | SearchOption | null>();

function buildSavedFoodsQuery(queryClient: QueryClient) {
  return queryOptions({
    queryKey: ["saved-foods"],
    queryFn: async () => {
      const [favorites, frequents, recents, custom] = await Promise.all([
        queryClient.fetchQuery(buildFavoriteFoodsQuery()),
        queryClient.fetchQuery(buildFrequentFoodsQuery()),
        queryClient.fetchQuery(buildRecentFoodsQuery()),
        queryClient.fetchQuery(buildCustomFoodsQuery()),
      ]);

      const allFoods = new Map<number, FoodOption>();

      const addFood = (food: Food) => {
        let foodOption = allFoods.get(food.foodId);

        if (!foodOption) {
          foodOption = { ...food };
          allFoods.set(food.foodId, foodOption);
        }

        return foodOption;
      };

      for (const food of favorites) {
        addFood(food).favorite = true;
      }

      for (const food of frequents) {
        addFood(food).frequent = true;
      }

      for (const food of recents) {
        addFood(food).recent = true;
      }

      for (const food of custom) {
        addFood(food);
      }

      return [...allFoods.values()];
    },
  });
}

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
        {option.accessLevel === "PRIVATE" && (
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

  const queryClient = useQueryClient();

  const { data: savedFoods } = useQuery(buildSavedFoodsQuery(queryClient));

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
      reason: AutocompleteChangeReason
    ) => {
      if (isSearchOption(value)) {
        setInputValue(inputValue);
        setSearchString(inputValue);
        return;
      }

      onChange?.(value);
    },
    [onChange, inputValue]
  );

  const handleInputChange = useCallback(
    (event: SyntheticEvent, value: string) => {
      setInputValue(value);
    },
    []
  );

  const handleEnter = useCallback(
    (
      event: React.KeyboardEvent<HTMLDivElement> & {
        defaultMuiPrevented?: boolean;
      }
    ) => {
      if (event.key === "Enter") {
        event.defaultMuiPrevented = true;
        event.preventDefault();
        setSearchString(inputValue);
      }
    },
    [setSearchString, inputValue]
  );

  const allOptions = useMemo(
    () => [...(savedFoods ?? []), ...(searchResults?.foods ?? [])],
    [savedFoods, searchResults]
  );

  return (
    <div className={className}>
      <Autocomplete
        loading={!savedFoods}
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
                noResults={isSuccess && searchResults?.foods.length === 0}
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
                foodId: -1,
                search: true,
                name: `Press enter to search for "${params.inputValue}" ...`,
              } as SearchOption,
            ];

            if (isSuccess && searchResults.foods.length === 0) {
              searchOptions = [
                {
                  foodId: -2,
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

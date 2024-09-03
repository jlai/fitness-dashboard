import {styled, Box, Typography} from "@mui/material";

import SeparatorBar from "./separator-bar"
import NutrientRow from "./nutrient-row"

const NUTRIENT_INDENT = "0.33rem";

interface LabelContainerProps {
  backgroundColor?: string,
  width?: string,
  color?: string
}

const LabelContainer = styled(Box)<LabelContainerProps>(({backgroundColor, width, color}) => ({
  backgroundColor: backgroundColor || "white",
  color: color || "black",
  fontFamily: ["Helvetica"],
  padding: "4px",
  textAlign: "left",
  width: width || "320px",
  margin: "auto"
}));

const Title = styled(Typography)(() => ({
  fontSize: "1.75rem",
  fontWeight: 900,
  margin: 0,
  fontFamily: ["Franklin Gothic Heavy", "Helvetica"],
}));

const ServingInfo = styled(Typography)(() => ({
  fontSize: "0.667rem",
  fontWeight: 400,
  margin: "1px 1px 3px"
}));

const AmountPerServing = styled(Typography)(() => ({
  fontSize: "0.667rem",
  fontWeight: 700,
  margin: "1px"
}));

const CalorieRow = styled(Box)(() => ({
  padding: 0,
  margin: "4px 0",
  lineHeight: "0.667rem",
  height: "0.667rem"
}));

const CaloriesLabel = styled(Typography)(() => ({
  fontSize: "0.667rem",
  fontWeight: 700,
  margin: "0 0 0 1px",
  float: "left"
}));

const CaloriesValue = styled(Typography)(() => ({
  fontSize: "0.667rem",
  fontWeight: 100,
  margin: "0 0 0 3px",
  float: "left"
}));

const CaloriesFromFat = styled(Typography)(() => ({
  fontSize: "0.667rem",
  fontWeight: 100,
  display: "inline-flex",
  margin: "0 1px 0 auto",
  float: "right"
}));

const PercentDailyValueLabel = styled(Typography)(() => ({
  lineHeight: "0.583rem",
  fontSize: "0.667rem",
  fontWeight: 100,
  textAlign: "right",
  margin: "3px 0 7px"
}));

const DailyValues = styled(Typography)(() => ({
  lineHeight: "0.583rem",
  fontSize: "0.583rem",
  fontWeight: 100,
  textAlign: "left",
  margin: "3px 0 7px"
}));

function NutritionLabel({
  backgroundColor, servingText, nutritionValues,
  width, minWidth, recommendedValues, digits
}: {
  backgroundColor?: string,
  servingText: string,
  minWidth?: string,
  width?: string,
  digits?: number,
  nutritionValues: {
    calories?: number,
    caloriesFromFat?: number,
    totalFat?: number,
    saturatedFat?: number,
    transFat?: number,
    cholesterol?: number,
    sodium?: number,
    potassium?: number,
    totalCarbohydrate?: number,
    dietaryFiber?: number,
    sugars?: number,
    protein?: number,
    vitamins?: Array<string>,
  },
  recommendedValues?: {
    calories?: number,
    caloriesFromFat?: number,
    totalFat?: number,
    saturatedFat?: number,
    cholesterol?: number,
    sodium?: number,
    potassium?: number,
    totalCarbohydrate?: number,
    dietaryFiber?: number,
    sugars?: number,
    protein?: number,
  }
}) {
  if (digits === undefined || digits < 0) {
    digits = 1;
  }

  return (
    <LabelContainer backgroundColor={backgroundColor} width={width || "auto"} minWidth={minWidth || 0}>
      <Title>Nutrition Facts</Title>
      <ServingInfo>
        {`Serving Size ${servingText}`}
      </ServingInfo>

      <SeparatorBar height={"0.583rem"} color={backgroundColor}/>

      <AmountPerServing>
        Amount Per Serving
      </AmountPerServing>

      <SeparatorBar height={"1px"} color={backgroundColor}/>

      <CalorieRow>
        <CaloriesLabel>
          Calories
        </CaloriesLabel>
        <CaloriesValue>
          { nutritionValues.calories ? Math.round(nutritionValues.calories) : 0 }
        </CaloriesValue>
        { nutritionValues.caloriesFromFat ? (
          <CaloriesFromFat>
            {`Calories from Fat ${(nutritionValues.caloriesFromFat || 0).toFixed(digits)}`}
          </CaloriesFromFat>
        ) : <></>}
      </CalorieRow>

      <SeparatorBar height={"4px"} color={backgroundColor}/>

      <PercentDailyValueLabel>
        % Daily Value*
      </PercentDailyValueLabel>

      <SeparatorBar height={"1px"} color={backgroundColor}/>

      <NutrientRow label={"Total Fat"} value={(nutritionValues.totalFat || 0)} unit="g" boldLabel
                   recommended={(recommendedValues?.totalFat || 78)} digits={digits}/>
      <NutrientRow label={"Saturated Fat"} value={(nutritionValues.saturatedFat || 0)} unit="g"
                   recommended={(recommendedValues?.saturatedFat || 0)} digits={digits} indent={NUTRIENT_INDENT}/>
      <NutrientRow label={"Trans Fat"} value={(nutritionValues.transFat || 0)}
                   digits={digits} unit="g" indent={NUTRIENT_INDENT}/>
      <NutrientRow label={"Cholesterol"} value={(nutritionValues.cholesterol || 0)} unit="mg" boldLabel
                   recommended={(recommendedValues?.cholesterol || 0)} digits={digits}/>
      <NutrientRow label={"Sodium"} value={(nutritionValues.sodium || 0)} unit="mg" boldLabel
                   recommended={(recommendedValues?.sodium || 2300)} digits={digits}/>
      <NutrientRow label={"Potassium"} value={(nutritionValues.potassium || 0)} unit="mg" boldLabel
                   recommended={(recommendedValues?.potassium || 0)} digits={digits}/>
      <NutrientRow label={"Total Carbohydrate"} value={(nutritionValues.totalCarbohydrate || 0)} unit="g" boldLabel
                   recommended={(recommendedValues?.totalCarbohydrate || 275)} digits={digits}/>
      <NutrientRow label={"Dietary Fiber"} value={(nutritionValues.dietaryFiber || 0)} digits={digits} unit="g"
                   recommended={(recommendedValues?.dietaryFiber || 28)} indent={NUTRIENT_INDENT}/>
      <NutrientRow label={"Sugars"} value={((nutritionValues.sugars || 0))} digits={digits} unit="g"
                   recommended={(recommendedValues?.sugars || 0)} indent={NUTRIENT_INDENT}/>
      <NutrientRow label={"Protein"} value={(nutritionValues.protein || 0)} unit="g" boldLabel
                   recommended={(recommendedValues?.protein || 50)} digits={digits}/>

      { nutritionValues.vitamins && nutritionValues.vitamins.length > 0 && (
        <SeparatorBar height={"7px"} color={backgroundColor}/>
      )}
      { nutritionValues.vitamins && nutritionValues.vitamins.map((vitaminString: string) =>
        <NutrientRow key={vitaminString} hideBar={false} label={vitaminString} value={0} unit="%"/>
      )}
      <DailyValues>
        {recommendedValues ? "* Percent Daily Values are based on the macro goals in your dashboard "
                           + `preferences for a ${recommendedValues.calories} calorie diet.`
                           : "* Percent Daily Values are based on a 2,000 calorie diet. "
                           + "Your Daily Values may be higher or lower depending on your calorie needs."}
      </DailyValues>
    </LabelContainer>
  )
}

export default NutritionLabel;
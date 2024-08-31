import {styled, Box, Typography} from "@mui/material";

import {formatValue} from "@/utils/food-amounts";

import SeparatorBar from "./separator-bar"
import NutrientRow from "./nutrient-row"


const NUTRIENT_INDENT = "0.33rem";

interface LabelContainerProps {
    backgroundColor?: string,
    width?: string,
    color?: string
}

const LabelContainer = styled(Box)<LabelContainerProps>(({ backgroundColor, width, color}) => ({
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

function NutritionLabel({ backgroundColor, servingText, calories, caloriesFromFat, totalFat, saturatedFat, transFat,
                          cholesterol, sodium, totalCarbohydrate, potassium, dietaryFiber, sugars, protein, vitamins,
                          width, minWidth, recommendedValues: recValues, digits, multiplier }
: {
  backgroundColor?: string,
  servingText: string,
  calories: number,
  caloriesFromFat: number,
  totalFat: number,
  saturatedFat: number,
  transFat: number,
  cholesterol: number,
  sodium: number,
  potassium: number,
  totalCarbohydrate: number,
  dietaryFiber: number,
  sugars: number,
  protein: number,
  vitamins: Array<string>,
  minWidth?: string,
  width?: string,
  digits?: number,
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
  },
  multiplier?: number
}) {

    if (digits === undefined) {
      digits = 1;
    }

    if (!multiplier || multiplier < 0) {
      multiplier = 1;
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
                    {formatValue((calories || 0) * multiplier, 0)}
                </CaloriesValue>
                {caloriesFromFat > 0 && (
                    <CaloriesFromFat>
                        {`Calories from Fat ${(caloriesFromFat * multiplier).toFixed(digits)}`}
                    </CaloriesFromFat>
                )}
            </CalorieRow>

            <SeparatorBar height={"4px"} color={backgroundColor}/>

            <PercentDailyValueLabel>
                % Daily Value*
            </PercentDailyValueLabel>

            <SeparatorBar height={"1px"} color={backgroundColor}/>

            <NutrientRow label={"Total Fat"} value={(totalFat || 0) * multiplier} unit="g" boldLabel
                         recommended={(recValues?.totalFat || 78)} digits={digits} />
            <NutrientRow label={"Saturated Fat"} value={(saturatedFat || 0) * multiplier} unit="g"
                         recommended={(recValues?.saturatedFat || 0)} digits={digits} indent={NUTRIENT_INDENT} />
            <NutrientRow label={"Trans Fat"} value={(transFat || 0) * multiplier} digits={digits} unit="g" indent={NUTRIENT_INDENT}/>
            <NutrientRow label={"Cholesterol"} value={(cholesterol || 0) * multiplier} unit="mg" boldLabel
                         recommended={(recValues?.cholesterol || 0)} digits={digits}/>
            <NutrientRow label={"Sodium"} value={(sodium || 0) * multiplier} unit="mg" boldLabel
                         recommended={(recValues?.sodium || 2300)} digits={digits}/>
            <NutrientRow label={"Potassium"} value={(potassium || 0) * multiplier} unit="mg" boldLabel
                         recommended={(recValues?.potassium || 0)} digits={digits}/>
            <NutrientRow label={"Total Carbohydrate"} value={(totalCarbohydrate || 0) * multiplier} unit="g" boldLabel
                         recommended={(recValues?.totalCarbohydrate || 275)} digits={digits}/>
            <NutrientRow label={"Dietary Fiber"} value={(dietaryFiber || 0) * multiplier} digits={digits} unit="g"
                         recommended={(recValues?.dietaryFiber || 28)} indent={NUTRIENT_INDENT}/>
            <NutrientRow label={"Sugars"} value={((sugars || 0) * multiplier)} digits={digits} unit="g"
                         recommended={(recValues?.sugars || 0)} indent={NUTRIENT_INDENT}/>
            <NutrientRow label={"Protein"} value={(protein || 0) * multiplier} unit="g" boldLabel
                         recommended={(recValues?.protein || 50)} digits={digits}/>

            {vitamins.length > 0 && (<SeparatorBar height={"7px"} color={backgroundColor}/>)}
            {vitamins.map(
                (vitaminString: string) =>
                    <NutrientRow key={vitaminString} hideBar={false} label={vitaminString} value={0} unit="%"/>
            )
            }
            <DailyValues>
                {recValues ? "* Percent Daily Values are based on the macro goals in your dashboard "
                                   + `preferences for a ${recValues.calories} calorie diet.`
                                   : "* Percent Daily Values are based on a 2,000 calorie diet. "
                                   + "Your Daily Values may be higher or lower depending on your calorie needs."}
            </DailyValues>
        </LabelContainer>
    )
}

export default NutritionLabel;
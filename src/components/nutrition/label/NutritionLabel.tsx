import {styled, Box, Typography} from "@mui/material";

import SeparatorBar from "./SeparatorBar"
import NutrientRow from "./NutrientRow"

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

function NutritionLabel({
    backgroundColor, servingText, calories, caloriesFromFat, totalFat,
    saturatedFat, transFat, cholesterol, sodium, totalCarbohydrate,
    potassium, dietaryFiber, sugars, protein, vitamins, width
}: {
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
    width?: string,
    //?=maybe for type
}) {
    return (
        <LabelContainer backgroundColor={backgroundColor} width={width}>
            <Title>Nutrition Facts</Title>
            <ServingInfo>
                {`Serving Size ${servingText}`}
            </ServingInfo>

            <SeparatorBar height={"0.583rem"} color={backgroundColor}/>

            <AmountPerServing>
                {`Amount Per Serving`}
            </AmountPerServing>

            <SeparatorBar height={"1px"} color={backgroundColor}/>

            <CalorieRow>
                <CaloriesLabel>
                    {`Calories `}
                </CaloriesLabel>
                <CaloriesValue>
                    {calories||0}
                </CaloriesValue>
                {caloriesFromFat > 0 && (
                    <CaloriesFromFat>
                        {`Calories from Fat ${caloriesFromFat}`}
                    </CaloriesFromFat>
                )}
            </CalorieRow>

            <SeparatorBar height={"4px"} color={backgroundColor}/>

            <PercentDailyValueLabel>
                {`% Daily Value*`}
            </PercentDailyValueLabel>

            <SeparatorBar height={"1px"} color={backgroundColor}/>

            <NutrientRow label={"Total Fat"} value={totalFat||0} unit="g" boldLabel={true} recommended={78} />
            <NutrientRow label={"Saturated Fat"} value={saturatedFat||0} unit="g" boldLabel={false} recommended={20} indent={NUTRIENT_INDENT}/>
            <NutrientRow label={"Trans Fat"} value={transFat||0} unit="g" boldLabel={false} indent={NUTRIENT_INDENT}/>
            <NutrientRow label={"Cholesterol"} value={cholesterol||0} unit="mg" boldLabel={true} recommended={300}/>
            <NutrientRow label={"Sodium"} value={sodium||0} unit="mg" boldLabel={true} recommended={2300}/>
            <NutrientRow label={"Potassium"} value={potassium||0} unit="mg" boldLabel={true} recommended={4700}/>
            <NutrientRow label={"Total Carbohydrate"} value={totalCarbohydrate||0} unit="g" boldLabel={true} recommended={275}/>
            <NutrientRow label={"Dietary Fiber"} value={dietaryFiber||0} unit="g" boldLabel={false} recommended={28} indent={NUTRIENT_INDENT}/>
            <NutrientRow label={"Sugars"} value={sugars||0} unit="g" boldLabel={false} recommended={50} indent={NUTRIENT_INDENT}/>
            <NutrientRow label={"Protein"} value={protein||0} unit="g" boldLabel={true} recommended={50}/>

            {vitamins.length > 0 && (<SeparatorBar height={"7px"} color={backgroundColor}/>)}
            {vitamins.map(
                (vitaminString: string) =>
                    <NutrientRow key={vitaminString} hideBar={false} label={vitaminString} value={0} unit="%"/>
            )
            }
            <DailyValues>
                {"* Percent Daily Values are based on a 2,000 calorie diet. Your Daily Values may be higher or lower depending on your calorie needs."}
            </DailyValues>
        </LabelContainer>
    )
}

export default NutritionLabel;